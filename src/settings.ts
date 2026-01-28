import { App, PluginSettingTab, Setting } from 'obsidian';
import type MindmapPreviewPlugin from './main';

export interface MindmapPreviewSettings {
    imageStorageStrategy: 'adjacent' | 'central' | 'custom';
    customAssetFolder: string;
    cleanupOldImages: boolean;
    useWikiLinks: boolean;
}

export const DEFAULT_SETTINGS: MindmapPreviewSettings = {
    imageStorageStrategy: 'adjacent',
    customAssetFolder: 'mindmap-assets',
    cleanupOldImages: true,
    useWikiLinks: true,
};

export class MindmapPreviewSettingTab extends PluginSettingTab {
    plugin: MindmapPreviewPlugin;

    constructor(app: App, plugin: MindmapPreviewPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Mindmap Preview Settings' });

        new Setting(containerEl)
            .setName('Image Storage Strategy')
            .setDesc('Where to store extracted images from XMind files')
            .addDropdown(dropdown => dropdown
                .addOption('adjacent', 'Next to source file (source.mm.assets/)')
                .addOption('central', 'Central folder (Vault root/_mindmap-assets/)')
                .addOption('custom', 'Custom path')
                .setValue(this.plugin.settings.imageStorageStrategy)
                .onChange(async (value) => {
                    this.plugin.settings.imageStorageStrategy = value as 'adjacent' | 'central' | 'custom';
                    await this.plugin.saveSettings();
                    this.display();
                }));

        if (this.plugin.settings.imageStorageStrategy === 'custom') {
            new Setting(containerEl)
                .setName('Custom Asset Folder')
                .setDesc('Relative path from vault root (e.g., "assets/images")')
                .addText(text => text
                    .setPlaceholder('assets/images')
                    .setValue(this.plugin.settings.customAssetFolder)
                    .onChange(async (value) => {
                        this.plugin.settings.customAssetFolder = value;
                        await this.plugin.saveSettings();
                    }));
        }

        new Setting(containerEl)
            .setName('Use Wiki Links')
            .setDesc('Use [[Wiki Links]] for images instead of standard Markdown ![alt](path)')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.useWikiLinks)
                .onChange(async (value) => {
                    this.plugin.settings.useWikiLinks = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Cleanup Old Images')
            .setDesc('Delete previously imported images when re-opening the same mindmap')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.cleanupOldImages)
                .onChange(async (value) => {
                    this.plugin.settings.cleanupOldImages = value;
                    await this.plugin.saveSettings();
                }));
    }
}