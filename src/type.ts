import { Plugin as ObsidianPlugin } from 'obsidian';

declare module 'obsidian' {
    interface Plugin {
        // 确保类型兼容性
    }
}

export type MindmapFileType = 'mm' | 'xmind';

export interface ImageResourceMap {
    [key: string]: string;
}