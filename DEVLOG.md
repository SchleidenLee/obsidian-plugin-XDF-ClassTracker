# DEVLOG — XDF ClassTracker

> 变更时间线，**只追加不回改**。每条：日期 + 改了什么 + **为什么**。
> 面向"人肉可读的历史决策"；面向用户的 Release 说明由流水线自动生成，此处不重复。

---

## 2026-10-17 · tag 规范化：裸 tag 全部改为 `v*`

- 最新版：删除裸 tag `1.0.4` 及其 Release（原手写说明已迁至新 Release），改为在 HEAD 重打 `v1.0.4` 推送，由统一流水线重新构建发布。
- 历史遗留：一并删除裸 tag `1.0.0`~`1.0.3` 及其 Release（其中 `1.0.2` 的手写说明随 Release 一并删除），仓库 tag 自此全部为 `v*`。
- **为什么**：`v*` 是流水线的唯一触发条件，裸 tag 不触发构建（旧 `tag-version-prefix: ""` 时代的遗留产物，Latest 曾长期挂在不符合规范的 tag 上）；且非 `v` 前缀会搅乱「取最新 tag」类脚本的排序。

## 2026-10-16 · 统一发布流水线

- 新增 `.github/workflows/release.yml`：推送 `v*` tag 触发，校验 `package.json` / `manifest.json` / tag 三者版本一致后构建并发布，release notes 自动生成；移除旧的 `tag-version-prefix` 配置。
- `.eslintignore` 忽略 `references/` 参考目录。
- **为什么**：统一发布口径，避免手搓 Release 与版本不一致。

## 2026-10-16 · 文档：代码审查整改计划

- 追加 2026-10-04 静态代码审查整改计划（约 20 条，含严重/高/中/低/安全）。
- **为什么**：把逐条核对过行号的问题固化下来，避免"知道有问题但记不清在哪"。

## 2026-09-14 · v1.0.4 Total 统计跟随日历展示月份

- 底部状态栏「Total」改为统计**当前日历展示月份**的课次，而非固定当月。
- 新增 UI 改造方案文档（后续并入本 DEVLOG 与 PENDING）。
- **为什么**：翻月查看历史排课时，Total 仍显示本月没有意义。

## 2026-09-04 · v1.0.3 反馈与 UI 精修

- 新增逾期（Overdue）逻辑：课程日次日 24:00 后未提交即判为逾期，格子与指示点标红；逾期颜色可配置（10 种红色预设）。
- 底部状态栏重构为 `Total / Pending / Overdue` 统计，移除底部导航栏。
- 格子色块改为 Flex 列布局强制沉底，修复色块错位。
- **彻底删除新建笔记功能**：移除 `modal.ts`、新建命令、右键菜单及相关设置项。
- 统一 description 格式，加入 `references/`（oz-calendar 上游）供比对。
- **为什么**：反馈状态是本插件核心价值，逾期提醒比新建功能更刚需；新建笔记在 Obsidian 中已有更自然的入口。

## 2026-09-04 · v1.0.2 功能精简

- 删除上游遗留的冗余项：`OZReminder` 类型、`extractFileName`、死函数 `scanTFileDate`、`sortingOption` 设置、`newNoteCancelButtonReverse`、`allowSlashhDuringCreate`、`fileNameOverflowBehaviour`、笔记列表 `+` 按钮、`createNote` 弹窗逻辑。
- `openFileBehaviour` 精简为 `new-tab` / `obsidian-default`；排序硬编码为时间升序。
- 汉化右键菜单；修复 `reloadPlugin` 硬编码插件名（`'oz-calendar'` → `this.manifest.id`）。
- 构建输出目录由 `build/` 改为 `dist/`。
- 修复一处未闭合 CSS 花括号导致的样式丢失。
- **为什么**：功能做减法，只保留教师高频路径；硬编码插件名在改名后必然失效。

## 2026-09-04 · v1.0.1 UI 复刻与字体统一

- 自定义日历头部：月份大字（1.4em）+ 年份弱化 + 箭头靠右，复刻 obsidian-calendar-ui 风格（移除 react-calendar 默认三段式导航）。
- 字体全部替换为 `var(--font-interface)`，与 Obsidian 界面同字体。
- **为什么**：与 Obsidian 原生观感一致，降低割裂感。

## 2026-08-31 · v1.0.0 中文化 + 设置重排

- 设置界面全中文化，标题改为「XDF ClassTracker 插件设置」。
- 课节时段设置移至设置页最顶部；移除上游作者 Coffee / 联系方式链接。
- 默认 YAML 键名设为 `Date`。
- **为什么**：面向国内教师用户，最高频的课节时段设置应置顶。

## 2026-08-25 ~ 08-26 · 课节时段可视化

- 新增 1-6 节课时段系统，日历格子底部渲染色块序列，色块颜色可配置。
- 调整色块宽度与间距。
- 插件重命名为 **XDF ClassTracker**。
- **为什么**：上游只有圆点标记，无法体现「第几节课」；时段色块让一天排课一目了然。

## 2026-05-03 ~ 05-05 · 排班管理

- 新增排班编辑器（Modal），可逐日标记「休息 / 加班」，日历格子按类型高亮。
- 排班数据迁移到独立 `schedule.json`（原与笔记耦合）。
- **为什么**：排班是跨笔记的元数据，不应与课节笔记耦合；JSON 读写简单、数据量小。

## 2024 及更早 · 上游 oz-calendar 历史

- 本仓库 2024 年及更早的提交均来自上游 [ozntel/oz-calendar](https://github.com/ozntel/oz-calendar)（v0.1.1 ~ v0.3.4，能力涵盖日历视图、笔记列表、周数、新建笔记、多种日历类型等），本项目改动均在 `7ab936e`（重命名为 XDF ClassTracker）之后。
- 上游历史详见 `git log`，此处不逐条搬运。

---

## 设计决策备忘（来源：原 CHANGES.md）

- **反馈状态为什么用「YAML + 正文 checkbox」双数据源**：教师在笔记正文里勾选 `- [x] 提交反馈` 是最自然的交互；`need_send_feedback` 只作为「是否需要跟踪」的开关。缺点是小写 `- [x]` 精确字符串匹配脆弱（见 PENDING 高优先项）。
- **为什么暂不用 JSON 磁盘缓存而实时扫描**：当前课节笔记量小（每天 1-6 篇），全量扫描开销可接受，且 Obsidian 的 metadata cache 已提供文件级缓存；引入磁盘缓存需处理失效与循环触发。待笔记量明显增长（500+）再启用（方案留存在 PENDING）。
- **为什么排班用 JSON 而非 Markdown**：见上文 2026-05 条目。
