# XDF ClassTracker

新东方教师课程追踪日历 Obsidian 插件。通过 YAML 字段识别课程笔记的日期和时间，在日历视图中标记课节时段、反馈状态与排班信息，帮助教师快速掌握每日课程安排。

## 功能一览

### 课节时段可视化
- 支持配置 **1-6 节课**时段（默认 10:00 / 12:20 / 15:30 / 17:50 / 20:10）
- 日历格子上以彩色色块标记当天已有的课节
- 色块颜色区分：待提交反馈（暖金色）/ 已提交（绿色），支持自定义配色

### 反馈状态跟踪
- 自动读取笔记 frontmatter 的 `need_send_feedback` 字段
- 扫描正文中的 `提交反馈` checkbox（`- [x] 提交反馈` / `- [ ] 提交反馈`）
- 笔记列表右侧显示反馈状态指示点，点击日历格子即可判断当天哪些课节已交反馈

### 排班管理
- 内置排班编辑器，可标记 **休息日**（绿色）和 **加班日**（橙色）
- 休息日可在日历上直接调休查看，日历格子自动高亮

### 课程笔记管理
- 按 YAML 日期字段将笔记自动归类到日历日期
- 笔记列表按课时时间排序（早课在前）
- 点击日历格子或 + 按钮快速创建带 YAML 日期的新课节笔记

## 安装

1. 在 Obsidian 设置 → 第三方插件 中关闭安全模式
2. 将 `dist/` 文件夹（含 `main.js`、`manifest.json`、`styles.css`）复制到你的 Vault 的 `.obsidian/plugins/xdf-classtracker/` 目录下
3. 刷新插件列表并启用 **XDF ClassTracker**

## 快速开始

### 第一步：设置日期来源

插件通过笔记的 frontmatter 识别课节日期。

1. 打开插件设置
2. 确认 **日期来源** 设为 `YAML 键名`
3. 设置 **YAML 键名** 为你使用的字段（默认 `Date`）
4. 设置 **日期格式**（默认 `YYYY-MM-DD hh:mm:ss`）
5. 点击 **重新加载插件**

在你的课程笔记 frontmatter 中添加日期：

```md
---
Date: 2026-09-01 10:00:00
need_send_feedback: true
---
```

> `hh:mm` 部分会被自动提取为课时时间，用于课节时段排序。

### 第二步：配置课节时段

在设置中调整每天的课节数（1-6 节），并逐一设置每节课的开始时间。插件会在日历格子上为匹配时间段的笔记渲染色块。

### 第三步：设置排班（可选）

在设置的 **排班设置** 区域点击 **打开排班编辑器**，逐日标记休息日或加班日。日历会自动以绿色/橙色高亮对应日期。

## 插件命令

| 命令 | 说明 |
|------|------|
| Go to Previous Day | 跳转到前一天 |
| Go to Next Day | 跳转到后一天 |
| Go to Today | 跳转到今天 |
| Create a New Note | 打开新建笔记弹窗 |
| Open OZ Calendar | 打开日历视图 |

可在 Obsidian 快捷键设置中为以上命令绑定快捷键。

## 新建笔记

点击日历下方的 **+** 按钮，或右键日历格子选择 "Create a note for this date"。插件会自动生成带 YAML 日期字段的 Markdown 文件。

可在设置中配置：
- **默认文件夹**：新建笔记的保存位置
- **文件名前缀日期格式**：文件名是否以日期开头（如 `YYYY-MM-DD`）
- **新建时显示文件夹选择**：每次新建时是否弹出文件夹选择

## 反馈工作流

典型的课节反馈流程：

1. 课程结束后在笔记正文中添加 checkbox：`- [ ] 提交反馈`
2. 确保 frontmatter 包含 `need_send_feedback: true`
3. 日历格子会显示暖金色块（待提交）
4. 提交反馈后将 checkbox 标记为完成：`- [x] 提交反馈`
5. 日历色块自动变为绿色

## 自定义样式

本插件支持通过 Obsidian 社区插件 [Style Settings](https://obsidian.md/plugins?id=style-settings) 自定义部分颜色。也可在 `obsidian.css` 中覆盖以下 CSS 变量：

```css
.theme-light, .theme-dark {
    --oz-calendar-weekend-color: #f76a6a;
    --oz-calendar-selected-daycolor: var(--text-normal);
    --oz-calendar-selected-day-background: var(--interactive-accent);
    --oz-calendar-header-date-color: var(--interactive-accent);
    --oz-calendar-current-day-color: #74dd58;
    --oz-calendar-weeknr-date-color: var(--color-accent-2);
}
```

## 已知限制

- 日期来源设为「文件名」时，部分功能（如反馈状态、时间排序）可能不生效
- 插件仅在 YAML 日期来源模式下完整支持所有功能

## 致谢

本插件基于 [ozntel/oz-calendar](https://github.com/ozntel/oz-calendar) 二次开发。UI 头部布局参考了 [liamcain/obsidian-calendar-plugin](https://github.com/liamcain/obsidian-calendar-plugin) 的设计。

## 许可证

MIT
