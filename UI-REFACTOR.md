# XDF ClassTracker UI 改造方案

## 状态：📋 待改造

## 现状问题

- ❌ 没有 Banner，直接 `h1` 标题
- ❌ 所有设置线性排列（课节/颜色/通用/日期/外观/排班）
- ❌ 没有版本/作者信息
- ❌ 颜色选择器用 inline style

## 改造方案

### 1. 添加 Banner

```html
<div class="xdf-banner">
  <div class="xdf-banner-icon">📅</div>
  <div>
    <h1 class="xdf-banner-title">XDF ClassTracker</h1>
    <p class="xdf-banner-desc">课程追踪日历插件</p>
  </div>
</div>
```

### 2. 调整设置分区

**首页（高频设置）：**
- 课节时段设置（每天课节数、各节时间）
- 配色方案（预设配色卡片）

**高级设置（折叠区）：**
- 通用设置（启动时打开日历、日历类型、显示周数、文件打开方式）
- 日期来源与格式设置（日期来源、YAML 键名、日期格式）
- 外观设置（固定日历高度）
- 排班设置（编辑排班表、清空排班数据）

### 3. 添加 Footer

```html
<div class="xdf-footer">
  <span class="xdf-version">v1.0.3</span>
  <span class="xdf-author">· Schleiden</span>
</div>
```

### 4. 颜色选择器改用 CSS 类名

把 inline style 改为使用 `.xdf-color-swatch` 等通用类名。

## 改动文件

- `src/settings/settings.ts` — 调整 HTML 结构，添加 Banner/Footer，把低频设置移到折叠区
- `src/styles.css` — 删除 inline style，改用 CSS 类名

## 预估工作量

- Banner/Footer：~20 行 HTML
- 设置分区调整：~30 行（把现有 Setting 移到 details 里）
- 颜色选择器样式：~15 行 CSS
