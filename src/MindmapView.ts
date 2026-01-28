import { ItemView, WorkspaceLeaf, TFile, MarkdownRenderer, Notice, normalizePath } from 'obsidian';
import type MindmapPreviewPlugin from './main';
import * as JSZip from 'jszip';
import { v4 as uuidv4 } from 'uuid';

export class MindmapView extends ItemView {
    private fileType: 'mm' | 'xmind';
    private plugin: MindmapPreviewPlugin;
    private currentFile: TFile | null = null;
    private importedImages: string[] = [];
    // 声明缺失的 imageResources 属性
    private imageResources: Map<string, string> = new Map();

    constructor(leaf: WorkspaceLeaf, fileType: 'mm' | 'xmind', plugin: MindmapPreviewPlugin) {
        super(leaf);
        this.fileType = fileType;
        this.plugin = plugin;
        this.navigation = true;
    }

    // 必须实现的抽象方法
    getViewType(): string {
        return `${this.fileType}-preview`;
    }

    // 必须实现的抽象方法
    getDisplayText(): string {
        return this.currentFile ? `${this.currentFile.basename} (Preview)` : 'Mindmap Preview';
    }

    async onOpen() {
        // 视图初始化
    }

    async onClose() {
        // 清理工作
    }

    async setState(state: any, result: any): Promise<void> {
        if (state.file) {
            const file = this.app.vault.getAbstractFileByPath(state.file);
            if (file instanceof TFile) {
                this.currentFile = file;
                await this.renderMindmap();
            }
        }
        await super.setState(state, result);
    }

    getState(): any {
        const state = super.getState();
        if (this.currentFile) {
            state.file = this.currentFile.path;
        }
        return state;
    }

    private async renderMindmap() {
        if (!this.currentFile) return;
        
        const container = this.contentEl;
        container.empty();
        
        try {
            let markdownContent = '';
            
            if (this.fileType === 'mm') {
                markdownContent = await this.parseMMFile(this.currentFile);
            } else {
                markdownContent = await this.parseXMindFile(this.currentFile);
            }
            
            const contentDiv = container.createDiv({ cls: 'mindmap-markdown-preview markdown-preview-view' });
            
            await MarkdownRenderer.render(
                this.app,
                markdownContent,
                contentDiv,
                this.currentFile.path,
                this
            );
            
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            container.createEl('div', { 
                text: `Error parsing mindmap: ${errorMsg}`,
                cls: 'error-message'
            });
            console.error(error);
        }
    }

    private getAssetFolderPath(): string {
        if (!this.currentFile) return '';
        const parentPath = this.currentFile.parent?.path || '';
        const baseName = this.currentFile.basename;
        
        switch (this.plugin.settings.imageStorageStrategy) {
            case 'adjacent':
                return normalizePath(`${parentPath}/${baseName}.assets`);
            case 'central':
                return normalizePath(`_mindmap-assets/${baseName}`);
            case 'custom':
                return normalizePath(`${this.plugin.settings.customAssetFolder}/${baseName}`);
            default:
                return normalizePath(`${parentPath}/${baseName}.assets`);
        }
    }

    private async cleanupOldAssets() {
        if (!this.plugin.settings.cleanupOldImages) return;
        
        if (this.importedImages.length > 0) {
            for (const imgPath of this.importedImages) {
                const existingFile = this.app.vault.getAbstractFileByPath(imgPath);
                if (existingFile instanceof TFile) {
                    try {
                        await this.app.vault.delete(existingFile);
                    } catch (e) {
                        console.warn(`Failed to delete old image: ${imgPath}`, e);
                    }
                }
            }
            this.importedImages = [];
        }
    }

    private async saveImageToVault(filename: string, blob: Blob): Promise<string> {
        const assetFolder = this.getAssetFolderPath();
        const extension = filename.split('.').pop() || 'png';
        const uniqueName = `${filename.split('.')[0]}_${uuidv4().slice(0, 8)}.${extension}`;
        const filePath = normalizePath(`${assetFolder}/${uniqueName}`);

        try {
            const folderExists = await this.app.vault.adapter.exists(assetFolder);
            if (!folderExists) {
                await this.app.vault.createFolder(assetFolder);
            }

            const arrayBuffer = await blob.arrayBuffer();
            const createdFile = await this.app.vault.createBinary(filePath, arrayBuffer);
            this.importedImages.push(filePath);
            
            if (this.plugin.settings.useWikiLinks) {
                return `![[${createdFile.path}]]`;
            } else {
                const encodedPath = encodeURI(createdFile.path);
                return `![${filename}](${encodedPath})`;
            }
            
        } catch (error) {
            console.error('Failed to save image:', error);
            new Notice(`Failed to save image: ${filename}`);
            throw error;
        }
    }

    private async parseMMFile(file: TFile): Promise<string> {
        const content = await this.app.vault.read(file);
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/xml');
        
        const rootNode = doc.querySelector('node');
        if (!rootNode) throw new Error('Invalid .mm file: no root node found');
        
        let markdown = '';
        const rootText = this.getNodeText(rootNode);
        if (rootText) {
            markdown += `**${rootText}**\n\n`;
        }
        
        const childNodes = rootNode.querySelectorAll(':scope > node');
        // 修复：将 NodeList 转换为 Array
        Array.from(childNodes).forEach(child => {
            markdown += this.processNode(child, 1);
        });
        
        return markdown;
    }

    private async parseXMindFile(file: TFile): Promise<string> {
        await this.cleanupOldAssets();
        this.imageResources.clear();
        
        const arrayBuffer = await this.app.vault.readBinary(file);
        const zip = await JSZip.loadAsync(arrayBuffer);
        
        await this.processXMindResources(zip);
        
        const contentFile = zip.file('content.xml');
        if (!contentFile) throw new Error('Invalid .xmind file: content.xml not found');
        
        const content = await contentFile.async('text');
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/xml');
        
        const sheet = doc.querySelector('sheet');
        if (!sheet) throw new Error('Invalid .xmind file: no sheet found');
        
        const rootTopic = sheet.querySelector('topic');
        if (!rootTopic) throw new Error('Invalid .xmind file: no root topic found');
        
        let markdown = '';
        const rootTitle = this.getXMindNodeTitle(rootTopic);
        if (rootTitle) {
            markdown += `**${rootTitle}**\n\n`;
        }
        
        const children = rootTopic.querySelector('children');
        if (children) {
            const topics = children.querySelectorAll('topics > topic');
            // 修复：使用 Array.from 转换 NodeList
            Array.from(topics).forEach(topic => {
                markdown += this.processXMindNode(topic, 1);
            });
        }
        
        return markdown;
    }

    private async processXMindResources(zip: JSZip): Promise<void> {
        const resourcesFolder = zip.folder('resources');
        if (!resourcesFolder) return;

        for (const [filename, file] of Object.entries(resourcesFolder.files)) {
            if (!filename.startsWith('resources/') || filename === 'resources/') continue;
            
            const imageName = filename.replace('resources/', '');
            
            try {
                const blob = await file.async('blob');
                const vaultLink = await this.saveImageToVault(imageName, blob);
                this.imageResources.set(imageName, vaultLink);
            } catch (e) {
                console.warn(`Failed to process resource: ${filename}`, e);
            }
        }
    }

  // 修复后的 processNode 方法
private processNode(node: Element, level: number): string {
    let result = '';
    const text = this.getNodeText(node);
    const hasChildren = node.querySelector('node') !== null;
    
    if (hasChildren) {
        const headingLevel = Math.min(level, 6);
        result += `${'#'.repeat(headingLevel)} ${text}\n\n`; // 确保标题后有双换行（空行）
        
        const childNodes = node.querySelectorAll(':scope > node');
        Array.from(childNodes).forEach(child => {
            result += this.processNode(child, level + 1);
        });
        
        result += '\n'; // 确保子树后有额外空行
    } else {
        // 叶子节点：使用标准列表格式，确保前面有空行
        // 注意：列表项不需要缩进，Markdown会自动根据上下文处理
        // 但在标题后面需要确保格式正确
        result += `- ${text}\n`;
        
        // 处理图片（如果有的话）
        const richcontent = node.querySelector('richcontent[type="NODE"]');
        if (richcontent) {
            const imgLink = this.extractImagesFromRichContent(richcontent);
            if (imgLink) {
                result += `  ${imgLink}\n`; // 图片缩进两个空格作为列表项的延续
            }
        }
    }
    
    return result;
}

// 修复后的 processXMindNode 方法
private processXMindNode(topic: Element, level: number): string {
    let result = '';
    const text = this.getXMindNodeTitle(topic);
    
    const children = topic.querySelector('children');
    const hasChildren = children !== null && children.querySelector('topic') !== null;
    
    const imageLink = this.extractXMindImage(topic);
    
    if (hasChildren) {
        const headingLevel = Math.min(level, 6);
        result += `${'#'.repeat(headingLevel)} ${text}\n\n`; // 双换行确保空行
        
        if (imageLink) {
            result += `${imageLink}\n\n`;
        }
        
        const topics = children.querySelectorAll(':scope > topics > topic');
        let childContent = '';
        Array.from(topics).forEach(child => {
            childContent += this.processXMindNode(child, level + 1);
        });
        
        result += childContent;
        result += '\n'; // 追加空行
    } else {
        // 叶子节点
        result += `- ${text}\n`;
        
        if (imageLink) {
            result += `  ${imageLink}\n`; // 图片作为列表项的延续，缩进2空格
        }
    }
    
    return result;
}

    private getNodeText(node: Element): string {
        const text = node.getAttribute('TEXT');
        if (text) return text;
        
        const richcontent = node.querySelector('richcontent[type="NODE"]');
        if (richcontent && richcontent.textContent) {
            return richcontent.textContent.trim() || '[Empty]';
        }
        
        return '[No Text]';
    }

    private getXMindNodeTitle(topic: Element): string {
        const title = topic.querySelector('title');
        return title?.textContent || '[Untitled]';
    }

    private extractXMindImage(topic: Element): string | null {
        const image = topic.querySelector('xhtml\\:img, img');
        if (!image) return null;
        
        const src = image.getAttribute('xhtml:src') || image.getAttribute('src');
        if (!src || !src.startsWith('xap:resources/')) return null;
        
        const resourceName = src.replace('xap:resources/', '');
        return this.imageResources.get(resourceName) || null;
    }

    private extractImagesFromRichContent(richcontent: Element): string {
        const images = richcontent.querySelectorAll('img');
        let result = '';
        Array.from(images).forEach(img => {
            const src = img.getAttribute('src');
            if (src) {
                result += `![image](${src}) `;
            }
        });
        return result.trim();
    }
}