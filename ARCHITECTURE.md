# ARCHITECTURE — XDF ClassTracker

> 现状架构说明。定位与使用见 [README.md](./README.md)；待办见 [PENDING.md](./PENDING.md)；变更史见 [DEVLOG.md](./DEVLOG.md)。

## 1. 定位

Obsidian 课程追踪日历插件（id `xdf-classtracker`，`isDesktopOnly: false`）。基于 [ozntel/oz-calendar](https://github.com/ozntel/oz-calendar) 二次开发（React + react-calendar），把课节笔记按 YAML 日期归类到日历，并用色块标记**课节时段**与**反馈状态**，用格子底色标记**排班**。

上游蓝图见 [CHANGES 已并入 DEVLOG](./DEVLOG.md)；UI 头部布局参考 [liamcain/obsidian-calendar-plugin](https://github.com/liamcain/obsidian-calendar-plugin)。

## 2. 目录结构

```
├── src/
│   ├── main.ts                 插件生命周期入口（OZCalendarPlugin）
│   ├── view.tsx                日历视图（ItemView + React root）
│   ├── types.ts                数据模型（OZNote / ScheduleData 等）
│   ├── ScheduleModal.tsx       排班编辑器弹窗
│   ├── components/
│   │   ├── calendar.tsx        react-calendar 封装 + 自定义头部 + 色块渲染
│   │   └── noteList.tsx        右侧笔记列表 + 底部状态栏统计
│   ├── hooks/
│   │   └── forceUpdate.tsx     强制刷新 hook
│   ├── settings/
│   │   ├── settings.ts         设置模型 + 设置页（SettingTab）
│   │   ├── suggest.ts          文本输入建议（当前未被引用）
│   │   └── suggestor.ts        文件夹建议（当前未被引用）
│   └── util/
│       ├── icons.ts            内联 SVG 图标
│       └── utils.ts            openFile / isMouseEvent 等工具函数
├── styles.css                  插件样式
├── dist/                       生产构建输出（main.js / manifest.json / styles.css）
└── references/                 本地参考仓库（obsidian-calendar-plugin，已 gitignore）
```

## 3. 模块职责

| 模块 | 职责 | 关键点 |
|------|------|--------|
| `src/main.ts` | 加载/保存设置；注册命令（前一天/后一天/今天/打开日历）；监听 `metadataCache` 的 `changed/rename/delete/create/resolved` 与文件变更联动；全库扫描 `getNotesWithDates`；维护 `OZCALENDARDAYS_STATE`；排班数据 load/save；`reloadPlugin()` | 事件注册与 state 更新逻辑集中于此，行数最多的核心文件 |
| `src/view.tsx` | 定义 `OZCalendarView`（`VIEW_TYPE = 'oz-calendar'`），管理 React root 的创建/卸载，渲染 `MyCalendar` | `onOpen` 中先 `destroy()` 再 `createRoot`，避免重复渲染 |
| `src/types.ts` | `OZNote` / `OZCalendarDaysMap` / `ScheduleDayType` / `ScheduleData` / `fileToOZItem` | `OZNote` 携带 `time` / `needSendFeedback` / `feedbackTaskDone` |
| `src/ScheduleModal.tsx` | 排班编辑器：逐日切换 `null → rest → overtime`，落盘 `schedule.json` | 数据存插件目录，非 Vault 笔记 |
| `src/components/calendar.tsx` | 封装 react-calendar；自定义头部（月份大字 + 年份弱化 + 箭头靠右）；`customTileContent` 渲染色块、`customTileClass` 渲染排班高亮；翻页命令处理 | 时段匹配 `timeSlots.includes(item.time)` |
| `src/components/noteList.tsx` | 右侧笔记列表（按课时时间升序）+ 反馈指示点；底部状态栏统计 `Total / Pending / Overdue` | 统计 `useMemo` 依赖 `OZCALENDARDAYS_STATE` |
| `src/hooks/forceUpdate.tsx` | `useForceUpdate`，供 state 变更后的视图刷新 | — |
| `src/settings/settings.ts` | `OZCalendarPluginSettings` + 默认值 + 设置页（课节时段、配色、日期来源、排班入口） | 默认 `dateFormat` 目前为 `hh`（12 小时制，见 PENDING 严重项） |
| `src/util/utils.ts` | `openFile` / `isMouseEvent`（被 noteList 使用）、`createNewMarkdownFile`（未引用） | — |
| `src/settings/suggest*.ts` | 文本/文件夹输入建议 | 当前无引用（见 PENDING 死代码项） |

## 4. 数据流

```
Vault 笔记 (frontmatter: Date / need_send_feedback) 
   │  写入 / 修改 / 重命名 / 删除
   ▼
metadataCache / workspace 事件（main.ts）
   ├─ getNotesWithDates()   全库扫描 → 提取日期 + 时间 + 反馈状态
   ├─ extractFeedbackInfo() 扫描正文 `- [ ] 提交反馈` checkbox
   └─ extractTimeFromDate() 从日期字段提取 HH:mm
   ▼
OZCALENDARDAYS_STATE: { 'YYYY-MM-DD': OZNote[] }
   ▼
OZCalendarView (view.tsx) → MyCalendar (calendar.tsx) + NoteList (noteList.tsx)
   ├─ 日历格子色块：待提交=暖金 / 已完成=绿 / 逾期=红
   ├─ 格子底色：休息=绿 / 加班=橙（读 schedule.json）
   └─ 底部状态栏：本月总课次 / 今日待反馈 / 历史逾期
```

- **日期来源双模式**：`yaml`（默认，读 frontmatter 的 `yamlKey`）或 `filename`（文件名即日期）。`filename` 模式下反馈状态/时间排序不生效（见 README 已知限制）。
- **排班数据**：独立存于插件目录 `schedule.json`，与课节笔记解耦；路径依赖 `manifest.dir`。
- **反馈状态**：以「YAML `need_send_feedback` + 正文 checkbox」双数据源判定；逾期 = 课节日期次日 `endOf('day')` 之后仍未完成。

## 5. 构建与发布

- 构建：`npm run build` = `tsc -noEmit -skipLibCheck` + `esbuild` → `dist/`（`main.js` / `manifest.json` / `styles.css`）。
- 开发：`npm run dev`（esbuild watch，输出到本地 Vault 插件目录）。
- 发布：`.github/workflows/release.yml` 由 tag `v*` 触发，校验 `package.json` / `manifest.json` / tag 三者版本一致后构建发布，release notes 自动生成。
- 版本号三处需一致：`package.json` / `manifest.json` / release tag。

## 6. 约定

- React 组件统一放在 `src/components/`，通过 `view.tsx` 挂载；state 变更后靠 `forceUpdate` 触发重渲染。
- 所有对 Vault 的写操作仅限右键「为这天创建笔记」；插件不修改既有笔记正文（反馈状态只读不写回，见 PENDING 技术债）。
- 排班等插件私有数据一律写插件目录 JSON，不污染 Vault 笔记。

## 7. 已知技术债（详见 PENDING）

- 默认日期格式 `hh`（12 小时制）导致下午/晚间课节时段匹配失败。
- `feedbackCache` 内存 Map 只删不清、从未写入，实际未生效；磁盘缓存方案未启用。
- 逾期/待办判定逻辑在 `calendar.tsx` 与 `noteList.tsx` 三处重复实现。
- `suggest.ts` / `suggestor.ts` / `createNewMarkdownFile` 等死代码；Font Awesome Pro 图标许可风险。
