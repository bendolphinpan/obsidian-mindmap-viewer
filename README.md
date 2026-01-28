# Mindmap Viewer
- Mindmap Viewer is a plugin that helps you to preview mindmap files (.mm and .xmind) directly in Obsidian as structured Markdown documents.
- Mindmap Viewer是一个帮助预览思维导图的插件（支持.mm和.xmind格式），可以直接在Obsidian中以markdown的格式预览。
- This is a preview version, if you have any problem or advise, please feel free to contact me.
- 这是一个预览版本，如果你有任何问题或者建议，欢迎联系我。作者主业是游戏策划，基于个人需求制作的这个插件，空闲时间会回应需求帮助完善构建:D
- This plugin is created with Kimi.
- 这个插件是在Kimi支持下打造的;)

## Features

- **Native Preview**: Click .mm or .xmind files to preview instantly
- **原生预览**：点击思维导图即可以原生形式预览
- **Hierarchical Structure**: Converts map nodes to Markdown headers (Level 2 → H1, Level 3 → H2, etc.)
- **层级结构**：预览中，二级节点将作为一级标题，一次类推
- **Leaf Node Lists**: Terminal nodes become bullet points
- **无序列表**：末端的节点将作为无序列表预览
- **Persistent Images**: Extracts and saves XMind images to your vault
- **图片预览**：图片将置于本地库中预览

## Installation

Search "Mindmap Preview" in Community Plugins and install.

## Usage

Simply click any .mm or .xmind file in your vault to preview.

### Settings

- **Image Storage Strategy**: Where to store extracted images
  - Adjacent: Create `filename.xmind.assets/` next to source file
  - Central: Store in `_mindmap-assets/filename/`
  - Custom: Define your own path