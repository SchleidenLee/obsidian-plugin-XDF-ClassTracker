# 魔改记录 — XDF ClassTracker vs oz-calendar

> 本文档记录本项目相对上游 [ozntel/oz-calendar](https://github.com/ozntel/oz-calendar) 的所有改动，包括功能增改、UI 优化、架构调整和设计决策。

## 一、功能增改

### 1. 课节时段可视化（新增）

| 项目 | 说明 |
|------|------|
| 上游状态 | 仅有圆点标记（无时段概念） |
| 改动 | 引入可配置的 1-6 节课时段系统，日历格子底部渲染色块序列，每个色块对应一节课 |
| 涉及文件 | `calendar.tsx`（tileContent 色块渲染）、`settings.ts`（课节数/时间设置 UI）、`styles.css`（色块样式） |

**实现要点**：
- 新增 `timeSlots` 设置（数组，默认 5 个时段）
- 新增 `slotPendingColor` / `slotDoneColor` 两种色块颜色
- `customTileContent` 遍历当天笔记，匹配 `item.time` 到对应时段，渲染色块

### 2. 反馈状态跟踪（新增）

| 项目 | 说明 |
|------|------|
| 上游状态 | 无 |
| 改动 | 读取 YAML 的 `need_send_feedback` 字段，扫描正文 `提交反馈` checkbox 状态，在日历格子色块和笔记列表中用双色指示器标记 |
| 涉及文件 | `main.ts`（`extractFeedbackInfo` 函数）、`types.ts`（新增 `needSendFeedback` / `feedbackTaskDone` 字段）、`noteList.tsx`（右侧指示点）、`calendar.tsx`（色块颜色逻辑） |

**实现要点**：
- 在 `scanTFileDate` 和 `getNotesWithDates` 等文件扫描处调用 `extractFeedbackInfo` 提取反馈状态
- 笔记列表 `noteList.tsx` 中 `needSendFeedback` 为 true 时显示右侧指示点
- 色块颜色根据 `feedbackTaskDone` 切换：待提交 = pendingColor（暖金色），已完成 = doneColor（绿色）

### 3. 排班管理（新增）

| 项目 | 说明 |
|------|------|
| 上游状态 | 无 |
| 改动 | 新增排班编辑器（Modal），可逐日标记「休息」/「加班」，数据存插件目录 `schedule.json`，日历格子按排班类型高亮 |
| 涉及文件 | 新增 `ScheduleModal.tsx`、`main.ts`（`scheduleData` 读写、`saveScheduleData`）、`types.ts`（`ScheduleDayType`、`ScheduleData`）、`calendar.tsx`（`customTileClass` 排班高亮）、`styles.css`（排班色样式）、`settings.ts`（排班设置入口） |

**实现要点**：
- `ScheduleDayType = 'rest' | 'overtime' | null`，三种状态循环切换
- 日历格子 CSS：`oz-calendar-schedule-rest`（绿色）、`oz-calendar-schedule-overtime`（橙色）
- 数据持久化：`this.app.vault.adapter` 读写插件目录下的 JSON 文件

### 4. 课时时间排序（新增）

| 项目 | 说明 |
|------|------|
| 上游状态 | 笔记列表按文件名排序 |
| 改动 | 从 YAML 日期字段提取 `HH:mm` 时间，笔记列表优先按时间升序排列，无时间的按文件名排序 |
| 涉及文件 | `main.ts`（`extractTimeFromDate`）、`noteList.tsx`（`sortedList.sort` 比较函数）、`styles.css`（`.oz-calendar-note-time` 时间戳样式） |

### 5. 右键创建指定日期笔记（新增）

| 项目 | 说明 |
|------|------|
| 上游状态 | 仅 + 按钮创建今天笔记 |
| 改动 | 右键日历日期格子弹出菜单，可选择 "Create a note for this date" |
| 涉及文件 | `main.ts`（`handleMonthDayContextMenu`）、`calendar.tsx`（day 选择器查询） |

### 6. 文件变更联动更新（增强）

| 项目 | 说明 |
|------|------|
| 上游状态 | 基础的文件 rename/delete/create 监听 |
| 改动 | 增强 `handleCacheChange` 中文件元数据变更的处理，反馈状态自动同步；rename 时自动重新提取时间和反馈信息 |
| 涉及文件 | `main.ts`（`handleCacheChange`、`handleRename`） |

## 二、UI 优化

### 1. 日历头部复刻

| 项目 | 说明 |
|------|------|
| 上游状态 | react-calendar 默认三段式导航（‹ | Aug 2026 | ›），居中标签 + 强调色 |
| 改动 | 自定义头部：月份大字（1.4em, weight 500, text-normal）+ 年份弱化（muted）+ 箭头靠右，复刻 obsidian-calendar-ui 风格 |
| 涉及文件 | `calendar.tsx`（自定义 `<div className="oz-calendar-header">` 替代默认导航）、`styles.css`（头部样式 + 隐藏 `.react-calendar__navigation`） |

**实现要点**：
- 使用 `react-icons` 的 `BsChevronLeft/Right` 替代默认箭头
- 移除 `onActiveStartDateChange`（已不触发），月份切换通过 `prevMonth/nextMonth` 手动调用
- `formatMonthYear` 保留但被 CSS `display: none` 隐藏

### 2. 字体统一为 Obsidian 系统字体

| 项目 | 说明 |
|------|------|
| 上游状态 | 硬编码 `font-family: 'Inter', system-ui, -apple-system, sans-serif` |
| 改动 | 全部替换为 `var(--font-interface)`，与 Obsidian 界面同字体 |
| 涉及文件 | `styles.css`（4 处替换） |

### 3. 设置界面全中文化

| 项目 | 说明 |
|------|------|
| 上游状态 | 英文设置面板 |
| 改动 | 所有设置标签、描述全中文，标题改为「XDF ClassTracker 插件设置」 |
| 涉及文件 | `settings.ts` |

### 4. 课节时段设置置顶

| 项目 | 说明 |
|------|------|
| 上游状态 | 设置面板通用设置在前 |
| 改动 | 课节时段设置移至设置面板最顶部，配色方案预设展示 |
| 涉及文件 | `settings.ts` |

### 5. 移除上游链接

| 项目 | 说明 |
|------|------|
| 上游状态 | 设置页底部有作者 Coffee 链接和联系方式 |
| 改动 | 完全移除 |
| 涉及文件 | `settings.ts` |

## 三、架构调整

### 1. 输出目录标准化

| 项目 | 说明 |
|------|------|
| 上游状态 | 编译产物在 `build/` |
| 改动 | 改为 `dist/`，统一项目构建规范 |
| 涉及文件 | `esbuild.config.mjs`（`outfile: 'dist/main.js'`）、`.gitignore` |

### 2. 编译配置修复

| 项目 | 说明 |
|------|------|
| 上游状态 | `tsconfig.json` 的 `include` 为 `"**/*.ts"`（扫描全项目） |
| 改动 | 收窄为 `"src/**/*.ts", "src/**/*.tsx"`，排除 `references/` 和 `node_modules` |
| 涉及文件 | `tsconfig.json` |

### 3. 目录清理

| 项目 | 说明 |
|------|------|
| 改动 | 删除上游残留的 `build/`、`release/oz-calendar/`、`img/`、根目录散落 `main.js` |
| 涉及文件 | 文件操作，不涉及代码修改 |

### 4. 新增 references 目录

| 项目 | 说明 |
|------|------|
| 改动 | 克隆 `liamcain/obsidian-calendar-plugin` 到 `references/` 作为 UI 设计参考，加入 `.gitignore` |
| 涉及文件 | `.gitignore`（添加 `references/`） |

## 四、设计决策

### 为什么选择 YAML + checkbox 双数据源做反馈？

**方案对比**：
- 方案 A：反馈状态存在 YAML 字段（如 `feedback_submitted: true`）— 需要额外维护一个字段
- 方案 B：从正文 checkbox 扫描 — markdown 交互感自然，用户直接在笔记里打勾

**选择方案 B** 的原因：
- 教师在笔记里写「提交反馈」checkbox 是最自然的交互方式
- 扫描 Obsidian 的 `CachedMetadata.listItems` 性能足够，文件变更时增量处理
- 缺点：首次全量扫描略耗时（但只做一次）

### 为什么不用 JSON 缓存而实时扫描？

当前实现每次读取文件内容来提取 checkbox 状态（内存 Map 仅做失效标记）。之前 PENDING 文档规划过 `feedback_cache.json` 磁盘缓存 + 增量更新的方案，但考虑到：
- 课节笔记数量通常不多（每天 1-6 篇），全量扫描开销小
- Obsidian 的 metadata cache 本身已经有文件级别的缓存
- 引入磁盘缓存需要处理缓存失效、循环触发等问题

**暂不实现磁盘缓存**，后续若笔记数量明显增长再考虑。

### 为什么排班数据用 JSON 而非 Obsidian 笔记？

**方案对比**：
- 方案 A：用 Markdown 笔记存排班（如 `2026-09-01.md` 的 frontmatter）
- 方案 B：用插件目录的 JSON 文件存

**选择方案 B** 的原因：
- 排班是跨笔记的元数据，不应该和课节笔记耦合
- JSON 读写简单，不需要解析 frontmatter
- 数据量小（每月 30 条左右），全量写入无压力
- 缺点：排班数据不在 Vault 的笔记系统里，用户不可见

## 五、上游来源说明

| 层面 | 来源 | 说明 |
|------|------|------|
| **代码基础** | [ozntel/oz-calendar](https://github.com/ozntel/oz-calendar) | React + react-calendar，项目的所有源代码和构建流程基于此 |
| **UI 灵感** | [liamcain/obsidian-calendar-plugin](https://github.com/liamcain/obsidian-calendar-plugin) | Svelte + obsidian-calendar-ui，仅参考其 CSS 样式和头部布局设计（月份大字 + 年份弱化 + 箭头靠右） |
| **参考仓库** | `references/obsidian-calendar-plugin` | 本地克隆，仅用于代码参考，已加入 `.gitignore` |

## 六、已知技术债

1. **feedback_cache.json 磁盘缓存未实现**（PENDING 中有完整设计，待笔记数量增长后启用）
2. **插件 → 文件双向同步未实现**（当前只能文件 → 插件，不支持在插件 UI 中点击 checkbox 写回文件）
3. **新建笔记弹窗仍为英文**（`modal.ts` 的 "Create Note"、"Cancel" 等文案未中文化）
4. **排班编辑器 weekday 为英文**（Sun/Mon/... 应改为中文）

## 七、v1.0.3 反馈与 UI 精修

| 改动项 | 说明 | 涉及文件 |
|--------|------|----------|
| 新增逾期（Overdue）逻辑 | 课程日次日 24:00 后未提交即判为逾期，格子与指示点标红 | `calendar.tsx`, `noteList.tsx` |
| 逾期颜色可配置 | 设置面板新增逾期颜色选项，支持 10 种红色预设 | `settings.ts` |
| 底部状态栏重构 | 新增 Total/Pending/Overdue 统计，移除底部导航栏 | `noteList.tsx`, `styles.css` |
| 格子布局修复 | 色块改为 Flex 列布局强制沉底，解决颜色块错位问题 | `styles.css` |
| 彻底删除新建功能 | 移除 `modal.ts`、新建命令、右键菜单及相关设置项 | `main.ts`, `settings.ts`, `modal.ts` |

## 八、v1.0.2 功能精简

| 改动项 | 说明 | 涉及文件 |
|--------|------|----------|
| 删除 `OZReminder` 类型 | 从未使用的占位代码 | `types.ts` |
| 删除 `extractFileName` | 冗余函数，`TFile.basename` 已替代 | `noteList.tsx` |
| 删除 `scanTFileDate` | 定义但未调用的死代码 | `main.ts` |
| 简化 `openFileBehaviour` | 只保留 `new-tab` 和 `obsidian-default`，默认 `new-tab` | `settings.ts`, `noteList.tsx`, `util/utils.ts` |
| 删除 `sortingOption` 设置 | 排序逻辑硬编码为时间升序 | `settings.ts` |
| 删除 `newNoteCancelButtonReverse` | 纯装饰性设置 | `settings.ts`, `modal.ts` |
| 删除 `allowSlashhDuringCreate` | 文件名斜杠当子文件夹，几乎不用 | `settings.ts`, `modal.ts` |
| 删除 `fileNameOverflowBehaviour` | `next-line` 选项无效，其他场景少用 | `settings.ts`, `styles.css` |
| 删除笔记列表 `+` 按钮 | 改为「当月总课次」统计 | `noteList.tsx`, `styles.css` |
| 删除 `createNote` 弹窗逻辑 | 保留右键「为这天创建笔记」功能 | `calendar.tsx` |
| 汉化右键菜单 | `Create a note for this date` → `为这天创建笔记` | `main.ts` |
| 修复 `reloadPlugin` | 硬编码插件名 `'oz-calendar'` → `this.manifest.id` | `main.ts` |
| 输出目录改为 `dist/` | 统一项目构建规范 | `esbuild.config.mjs`, `.gitignore` |

## 九、diff 参考

以下命令可在本地快速查看代码差异：

```bash
# 文件级差异（仅 src 目录）
diff -r references/obsidian-calendar-plugin/src src/

# git 提交历史（本项目基于上游的增量提交）
git log --oneline --all
```

上游 `oz-calendar` 的最新 commit 可作为基准线对比，本项目所有改动均在 `7ab936e`（重命名为 XDF ClassTracker）之后的提交中。
