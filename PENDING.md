# PENDING — XDF ClassTracker

> 待办清单。分区：**⚪ 待定**（方案未定）/ **🟡 已定待做**（方案已定，等动手）/ **🟢 进行中**。
> 完成一项后：从本文件**删除**该条 → 在 [DEVLOG.md](./DEVLOG.md) 追加一行 → 现状变了就更新 [ARCHITECTURE.md](./ARCHITECTURE.md)。

> 注：下方「代码审查整改」的行号基准为 **2026-10-04** 的源码快照，动工时以实际代码为准。

---

## 🟢 进行中

（无）

---

## 🟡 已定待做

### A. 代码审查整改（严重）

- [ ] **默认日期格式使用 12 小时制 `hh`，导致下午/晚间课节解析错误** — `src/settings/settings.ts:28`
  - 现象：`DEFAULT_SETTINGS.dateFormat = 'YYYY-MM-DD hh:mm:ss'`；`timeSlots` 默认 `['10:00','12:20','15:30','17:50','20:10']`（`settings.ts:32`）。dayjs 中 `hh` 为 12 小时制，`15:30` 被回绕为 `03:30`，与 `timeSlots` 匹配失败。
  - 影响：下午/晚间课节在日历上不显示时段色块。
  - 方案：默认改为 `'YYYY-MM-DD HH:mm:ss'`；对已保存的旧设置提供迁移或设置页提示；核对 `extractTimeFromDate`（`main.ts:130-140`）与文件名分支一致。

- [ ] **日期解析缺少 `isValid` / 严格校验** — `src/main.ts:249`、`src/main.ts:437-439`
  - 现象：`handleCacheChange`（`main.ts:249`）与 `getNotesWithDates`（`main.ts:437-439`）直接 `format`，未做 `isValid` 判断（对照 `main.ts:132-134`、`322/346`、`471` 有校验）。
  - 影响：非法/缺失日期被静默格式化为错误日期，或生成 `Invalid Date` 键污染 state。
  - 方案：下沉统一「解析并校验」辅助函数，`isValid()` 为假时跳过并 `console.debug` 记录。

### A. 代码审查整改（高）

- [ ] **`metadataCache.on('resolved')` 未走 `registerEvent`，且 `onunload` 为空** — `src/main.ts:40-47`、`src/main.ts:112-113`
  - 现象：`resolved` 监听未 `registerEvent`（同文件 `changed/rename/delete/create` 均已注册）；`onunload()` 空实现。`reloadPlugin()` 会重新触发 `onload`。
  - 影响：禁用后监听器不清理；重载后叠加，`resolved` 重复执行、全库扫描次数递增。
  - 方案：改为 `this.registerEvent(...)` 或在 `onunload` 中 `offref`。

- [ ] **翻页命令使用过期的 `selectedDay` 闭包** — `src/components/calendar.tsx:18-25`、`27-47`
  - 现象：`useEffect(..., [])` 只挂载一次，`changeDate` 闭包捕获首次 `selectedDay`；靠 setState updater 取当前值不可靠。
  - 影响：命令面板触发「前一天/后一天」可能基于过期日期，跳转错位。
  - 方案：改用 `useRef` 保存最新 `selectedDay`，或在 updater 内直接函数式计算。

- [ ] **启动全库扫描执行两次，且 `feedbackCache` 从未写入** — `src/main.ts:40-47`、`49-54`
  - 现象：`resolved`（`main.ts:40-47`）与 `workspace.onLayoutReady`（`main.ts:49-54`）都可能触发 `getNotesWithDates()`；`feedbackCache`（`main.ts:15`）只被 `delete`/`clear`，全库无 `set` 写入。
  - 影响：大 vault 启动重复全量遍历 + 逐文件读盘；`feedbackCache` 成为无效死状态。
  - 方案：保留单一启动扫描入口（用 `initialScanCompleted` 统一守卫）；若要启用缓存，则真正落地 `set` 写入并在 `extractFeedbackInfo` 优先读（见 ⚪ C）。

- [ ] **反馈「已完成」判定依赖精确字符串匹配** — `src/main.ts:162-169`
  - 现象：仅当 `content.includes('- [x] 提交反馈')` 判完成，其余默认未完成。
  - 影响：`- [X]`、不同缩进、全角符号、行尾追加内容等变体会被误判，产生虚假待提交/逾期告警。
  - 方案：改用正则 `/^\s*-\s*\[[xX]\]\s*提交反馈/m`，或任务文本关键词可在设置中配置。

### A. 代码审查整改（中）

- [ ] **用 `in` 判断数组是否包含文件路径，恒为 false** — `src/main.ts:263`
  - 方案：改为 `.some((it) => it.type === 'note' && it.path === file.path)`。
- [ ] **每次文件变更都全量遍历 state** — `src/main.ts:210-223`
  - 方案：维护 `path -> dateKey` 反向索引，按索引定位。
- [ ] **无时间分量的日期被格式化为 `00:00`** — `src/main.ts:441`、`130-134`
  - 方案：仅当原串含 `\d{1,2}:\d{2}` 时才提取 `time`，否则 `undefined`。
- [ ] **文件名来源用格式串长度做启发式校验** — `src/main.ts:469-471`
  - 方案：移除长度启发式，直接 `dayjs(name, format, true)` 严格模式。
- [ ] **重命名时就地修改 state 内对象，yaml/filename 分支不一致** — `src/main.ts:290-308`、`310-315`
  - 方案：统一为不可变更新并抽取共用逻辑。
- [ ] **时段设置无格式校验/归一化** — `src/settings/settings.ts:76-86`
  - 方案：校验 `^([01]\d|2[0-3]):[0-5]\d$`，非法回退或提示。
- [ ] **设置页用 `document.querySelector` 直接操作 DOM** — `src/settings/settings.ts:306-313`
  - 方案：改用已持有的 `Setting` 引用 `settingEl.toggleClass(...)`。
- [ ] **设置项逐次写盘无防抖** — `src/settings/settings.ts:80-84`、`146-150`
  - 方案：`saveSettings` 加防抖（如 300ms）。
- [ ] **NoteList 统计每次强制刷新全库遍历；tile 回调每次渲染重建** — `src/components/noteList.tsx:55-86`、`src/components/calendar.tsx:100-117`
  - 方案：统计增量维护或缓存；tile 回调用 `useCallback` 记忆化并去掉形参遮蔽。
- [ ] **逾期/待办判定逻辑三处重复** — `src/components/calendar.tsx:59`、`noteList.tsx:74-82`、`129-132`
  - 方案：抽 `isFeedbackOverdue` / `getFeedbackStatus` 纯函数三处复用。
- [ ] **日期解析行为在不同路径不一致** — `src/main.ts:130-140` vs `246-250`、`435-441`
  - 方案：统一解析/校验工具（与「缺少 isValid」合并修复）。

### A. 代码审查整改（低）

- [ ] **冗余 `as any` 断言** — `src/components/calendar.tsx:59`、`62` → 以 `item.type === 'note'` 收窄后直访。
- [ ] **死代码** — `src/settings/suggest.ts`、`suggestor.ts`、`src/util/utils.ts`（`createNewMarkdownFile`）、`src/main.ts:15`（`feedbackCache`）→ 确认无规划后移除。
- [ ] **排班文件路径依赖 `manifest.dir`** — `src/main.ts:382-411` → 改用 `vault.configDir + 插件 id` 或对空值兜底。
- [ ] **`getRightLeaf` 返回值未判空** — `src/main.ts:367-368` → 判空后 `setViewState`，否则回退 `getLeaf(true)`。
- [ ] **Font Awesome Pro 图标许可风险** — `src/util/icons.ts:1` → 换免费图标或自绘 SVG，移除 Pro 许可注释。
- [ ] **`wrapAround` 除零产生 NaN** — `src/settings/suggest.ts:84`、`8-10` → `size === 0` 直接返回 `0`，或随死代码移除。
- [ ] **未使用的 props** — `src/components/noteList.tsx:13-15` → 确认后从参数与调用处移除。
- [ ] **React root 生命周期** — `src/view.tsx:32-43` → 静态看已处理，需复现确认后再决定是否加固。
- [ ] **`reloadPlugin` 使用私有 API 且未 `await`** — `src/main.ts:413-418` → 提示用户手动重载，或两次调用加 `await` 容错。

### A. 代码审查整改（安全）

- [ ] **无直接漏洞；关注私有 API 依赖（`main.ts:415-417`）与图标许可（`icons.ts:1`）** — 见上文对应条目。

### B. 设置页 UI 改造

现状问题：无 Banner（直接 `h1` 标题）、设置项线性排列、无版本/作者信息。

- [ ] 添加 Banner（图标 📅 + 标题 `XDF ClassTracker` + 副标题 `课程追踪日历插件`）。
- [ ] 设置分区：首页放高频项（课节时段、配色方案）；「高级设置」折叠区放通用 / 日期来源 / 外观 / 排班。
- [ ] 添加 Footer（`v1.0.4 · Schleiden`）。
- [ ] 颜色选择器由写死取值改为 CSS 类名控制。
- 改动文件：`src/settings/settings.ts`、`styles.css`。

---

## ⚪ 待定

### C. feedback_cache.json 磁盘缓存

方案已设计（详见本节），但触发条件未到 → 状态待定。

- **缓存文件**：插件目录 `feedback_cache.json`，格式 `{ "<note.md>": { need_send_feedback, feedbackTaskDone, last_updated } }`。
- **构建**：遍历 md → 过滤 `need_send_feedback: true` → 读正文提取 checkbox → 写缓存（首次略耗时）。
- **增量**：监听 `metadataCache.on('changed')`，只处理变更文件。
- **触发条件**：当前笔记量少（每天 1-6 篇）无瓶颈，**待笔记量明显增长（如 500+ 篇）且切换日期卡顿后再启用**。
- 涉及文件：`main.ts`（`loadFeedbackCache` / `saveFeedbackCache`、`extractFeedbackInfo` 优先读缓存）。

### D. 其他技术债

- [ ] **插件 → 文件双向同步**：当前只能文件 → 插件；不支持在插件 UI 点击 checkbox 写回文件。
- [ ] **排班编辑器 weekday 为英文**：`src/ScheduleModal.tsx:53` 的 `['Sun','Mon',...]` 应改为中文。
- [ ] **README 与实际功能不符**：「课程笔记管理」仍写「点击日历格子或 + 按钮快速创建…」，但 v1.0.3 已彻底删除新建功能，需据实修正。
