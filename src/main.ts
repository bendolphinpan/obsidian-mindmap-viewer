import { Plugin, WorkspaceLeaf, TFile } from 'obsidian';
import { MindmapView } from './MindmapView';
import { MindmapPreviewSettings, DEFAULT_SETTINGS, MindmapPreviewSettingTab } from './settings';

export default class MindmapPreviewPlugin extends Plugin {
    settings: MindmapPreviewSettings;

    async onload() {
        await this.loadSettings();
        
        this.addSettingTab(new MindmapPreviewSettingTab(this.app, this));

        // 修复：确保类型正确传递
        this.registerView('mm-preview', (leaf: WorkspaceLeaf) => {
            return new MindmapView(leaf, 'mm', this);
        });
        
        this.registerView('xmind-preview', (leaf: WorkspaceLeaf) => {
            return new MindmapView(leaf, 'xmind', this);
        });
        
        this.registerExtensions(['mm'], 'mm-preview');
        this.registerExtensions(['xmind'], 'xmind-preview');
    }

    onunload() {
        // 清理工作
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}