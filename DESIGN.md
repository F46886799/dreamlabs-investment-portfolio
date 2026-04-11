# 设计系统 — DreamLabs 投资组合

## 产品背景

- **产品名称**：DreamLabs 投资组合平台
- **定位**：专业投资组合聚合与对账系统
- **用户**：财务顾问 + 个人投资者（混合）
- **项目类型**：金融仪表板 / 报表应用
- **核心原则**：数据为主角。设计退居二线，但赢得信任。

---

## 设计基础

本项目基于 **shadcn/ui "new-york" 风格**，使用现代的 **OKLCH 色彩空间**进行设计。所有设计决策都与现有的 Tailwind CSS 主题集成。

### 颜色系统（CSS 变量）

项目在 `frontend/src/index.css` 中定义了完整的色彩系统。以下是关键的色彩映射：

#### 浅色模式（`:root`）

| 变量 | OKLCH 值 | 用途 |
|------|---------|------|
| `--primary` | oklch(0.5982 0.10687 182.4689) | 主交互色（青蓝） |
| `--destructive` | oklch(0.577 0.245 27.325) | 错误、危险状态 |
| `--background` | oklch(1 0 0) | 页面背景（纯白） |
| `--foreground` | oklch(0.145 0 0) | 主文本（深灰） |
| `--card` | oklch(1 0 0) | 卡片/容器背景 |
| `--border` | oklch(0.922 0 0) | 边框颜色 |
| `--muted` | oklch(0.97 0 0) | 禁用/次要背景 |
| `--muted-foreground` | oklch(0.556 0 0) | 次要文本 |

#### 深色模式（`.dark`）

| 变量 | OKLCH 值 | 用途 |
|------|---------|------|
| `--primary` | oklch(0.65 0.10687 182.4689) | 主交互色（亮青蓝） |
| `--background` | oklch(0.145 0 0) | 页面背景（深灰） |
| `--foreground` | oklch(0.985 0 0) | 主文本（浅白） |
| `--card` | oklch(0.205 0 0) | 卡片/容器背景 |
| `--border` | oklch(1 0 0 / 10%) | 边框（半透明白） |

#### 图表颜色（数据可视化）

```
--chart-1: oklch(0.646 0.222 41.116)   # 橙色
--chart-2: oklch(0.6 0.118 184.704)    # 青색
--chart-3: oklch(0.398 0.07 227.392)   # 深蓝
--chart-4: oklch(0.828 0.189 84.429)   # 黄转绿
--chart-5: oklch(0.769 0.188 70.08)    # 黄
```

> 注：OKLCH 是 CIELAB 色彩空间在圆柱坐标中的表示。L=亮度，C=色度，H=色调。这个系统保证了颜色在亮度变化时的感知一致性。

---

## 投资组合仪表板 — 设计补充

### 1. 专门的状态颜色

虽然项目已有 primary（主色）和 destructive（错误色），投资组合仪表板需要额外的语义化颜色：

| 语义 | Tailwind 类 | 用途 | 注释 |
|------|-----------|------|------|
| **成功** | `bg-green-600` | 数据同步成功、已验证头寸 | 使用"绿色" semantic token |
| **警告** | `bg-amber-600` | 数据过期 (>48h)、存在冲突 | 琥珀色，避免过度警报 |
| **信息** | `bg-blue-600` | 提示、帮助文本 | 与主色重叠，用 `opacity-75` 区分 |

**实现方案**：
- 使用 Tailwind 的扩展色板：`green-{50-950}`, `amber-{50-950}`
- 在 Alert 组件中应用（已有的 `alert.tsx`）
- Badge 组件支持多个变体

### 2. 数据表格样式

投资组合数据表格的特定样式指南：

```tsx
// 表格标题行
<thead className="border-b-2 border-border bg-muted">
  <th className="text-xs font-semibold uppercase tracking-wider">
    列名
  </th>
</thead>

// 表格数据行
<tbody>
  <tr className="border-b border-border hover:bg-muted/50">
    <td className="font-mono tabular-nums">数字或货币</td>
  </tr>
</tbody>
```

**关键点**：
- 货币/数值字段使用 `font-mono` (monospace) 和 `tabular-nums` 确保数字对齐
- 行 hover 状态用 `bg-muted/50` 而不是完全的 primary 色
- 表格行高 `h-10` (40px) 以适应财务数据的可读性

### 3. 仪表板卡片层级

投资组合仪表板通常分 4 层网格：

```tsx
// 一级指标：重要 KPI
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <Card className="p-6">
    <p className="text-sm text-muted-foreground uppercase tracking-wide">
      总资产
    </p>
    <p className="text-3xl font-semibold mt-2">$2,450,750</p>
  </Card>
</div>

// 二级内容：表格 + 图表
<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
  <Card className="lg:col-span-2">
    {/* 持仓表 */}
  </Card>
  <Card>
    {/* 资产配置图 */}
  </Card>
</div>
```

**响应式断点**：
- `sm`: 640px
- `md`: 768px (2 列)
- `lg`: 1024px (4 列)
- `xl`: 1280px (max content)

### 4. 警告与状态指示

#### 数据过期警告（Stale Data）

```tsx
<Alert variant="default" className="border-amber-600 bg-amber-50">
  <AlertCircle className="h-4 w-4 text-amber-600" />
  <AlertTitle className="text-amber-900">需要关注</AlertTitle>
  <AlertDescription className="text-amber-800">
    一个连接器在 48 小时内未更新，数据可能过期
  </AlertDescription>
</Alert>
```

#### 同步冲突（Conflict）

```tsx
<Badge className="bg-amber-100 text-amber-800">
  3 个冲突
</Badge>
```

#### 同步成功状态

```tsx
<div className="flex items-center gap-2">
  <div className="h-2 w-2 rounded-full bg-green-600" />
  <span className="text-sm text-green-700">最后同步: 5分钟前</span>
</div>
```

---

## 排版规范

项目使用系统字体堆栈，由 shadcn/ui 定义：

```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
  "Helvetica Neue", Arial, "Noto Sans", sans-serif;
```

### 字体大小梯度（Tailwind）

| 用途 | 类名 | px | 用途 |
|------|------|----|----|
| 页面标题 | `text-3xl` | 30px | h1 |
| 卡片标题 | `text-2xl` | 24px | h2 |
| 小标题 | `text-lg` | 18px | h3 |
| 标签/上标 | `text-xs` | 12px | 表头、Badge |
| 正文 | `text-sm` | 14px | 描述文本 |
| 数据 | `text-base` | 16px | 表格、指标 |

### 投资组合特定排版

| 元素 | 样式 | 说明 |
|------|------|------|
| 指标值 | `text-3xl font-semibold` | 大数字，确保易读 |
| 指标标签 | `text-xs uppercase tracking-wide` | 小大写 + 字体间距 |
| 货币值 | `font-mono text-base` | monospace 确保数字对齐 |
| 股票代码 | `font-mono font-semibold text-primary` | 突出显示 |

---

## 间距与间距系统

所有间距遵循 Tailwind 的 4px 基础单位：

| Gap/Margin | Tailwind | px | 用途 |
|-----------|----------|-------------------|------|
| xs | `gap-2` | 8px | 元素内间距 |
| sm | `gap-3` | 12px | 组件间距 |
| md | `gap-4` | 16px | 卡片/段落间距 |
| lg | `gap-6` | 24px | 大区块间距 |
| xl | `gap-8` | 32px | 页面段落间距 |

### 卡片内部间距规范

```tsx
<Card className="p-6">  {/* 外边距 */}
  <div className="mb-4">  {/* 内容间距 */}
    <h3 className="mb-2">标题</h3>  {/* 标题下边距 */}
    <p>内容</p>
  </div>
</Card>
```

---

## 圆角（Border Radius）

```css
--radius: 0.625rem;  /* 10px */
--radius-sm: 0.375rem;  /* 6px - 输入框、小按钮 */
--radius-md: 0.5rem;  /* 8px - 卡片、对话框 */
--radius-lg: 0.625rem;  /* 10px - 默认 */
--radius-xl: 0.75rem;  /* 12px - 大容器 */
```

**应用**：
- 输入框、按钮：`rounded-sm` (6px)
- 卡片、对话框：`rounded-md` (8px)
- 容器：`rounded-lg` (10px)

---

## 动画与过渡

项目的动画保持最小化，支持性能和可访问性：

```css
/* 基础过渡时间 */
transition: background-color 150ms ease-in-out;
transition: opacity 150ms ease-in-out;
```

### 投资组合特定动画

- **数据更新**：使用 `opacity-75 -> opacity-100` 而不是闪烁
- **表格行 hover**：`bg-muted/50` 平滑过渡，不使用颜色跳变
- **状态指示**：用 `scale-100 -> scale-110` 轻微缩放表示交互

---

## 响应式设计

### 仪表板布局架构

```
Mobile (< 640px):       1 列
Tablet (640-1024px):   2-3 列
Desktop (> 1024px):    4-6 列
```

### 关键页面响应式规则

**投资组合主视图**：
```tsx
// 指标卡片网格
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

// 表格容器
<div className="overflow-x-auto">
  <table className="min-w-full">
```

**持仓表格**：
- 手机：5 列 → 简化为代码 + 市值
- 平板：6 列 → 显示数量、价格、市值
- 桌面：8 列 → 完整明细 + 状态 + 冲突标志

---

## 无障碍性（A11y）

- 所有交互元素有清晰的 focus 状态（dark:ring-offset-neutral-950）
- 颜色对比度符合 WCAG AA 标准
- 链接使用 `text-primary underline` 而不是仅依赖颜色
- 表单错误使用文本 + 颜色
- 按钮使用 `aria-label` 用于图标按钮

---

## 深色模式

项目完全支持深色模式（`.dark` 类）。

### 投资组合深色模式调整

- **表格**：使用 `dark:bg-neutral-900` 代替纯黑（#000000）以减少疲劳
- **卡片**：`dark:bg-neutral-900` 而不是 `dark:bg-black`
- **文本**：主文本 `dark:text-neutral-50`，次要文本 `dark:text-neutral-400`
- **警告**：琥珀色在深色模式下更亮（`dark:bg-amber-900/50`）

---

## 技术实现

### Tailwind CSS 配置

项目不使用单独的 `tailwind.config.js`，而是通过 CSS 变量实现。`frontend/src/index.css` 定义了所有主题值。

### 组件库

- **UI 组件**：`frontend/src/components/ui/` (shadcn/ui)
- **业务组件**：`frontend/src/components/` (项目特定)
- **表单**：基于 React Hook Form + Zod 验证

### 类名约定

- 使用 Tailwind 类名，不创建自定义 CSS 类
- 复杂组件：使用 `clsx` 或 `cn` 工具函数
- 条件样式：`className={cn("base", condition && "conditional")}`

---

## 决策日志

| 日期 | 决策 | 理由 |
|------|------|------|
| 2026-04-11 | 保留现有 shadcn/ui 风格 | 已有完整组件库和主题配置，无需重复投入 |
| 2026-04-11 | 添加琥珀色警告状态 | 区分"过期"vs"错误"，减少认知过载 |
| 2026-04-11 | 投资组合数据表使用 monospace | 数字对齐，提高财务数据可读性 |
| 2026-04-11 | 采用现有 OKLCH 色彩系统 | 现代、感知一致的颜色管理 |

---

## 快速参考

### 导入常用色彩变量

```tsx
// 在任何组件中使用 Tailwind 类
<button className="bg-primary text-primary-foreground hover:bg-primary/90">
  同步
</button>

<div className="text-destructive">错误信息</div>
<div className="text-green-600">成功消息</div>
<div className="text-amber-600">警告消息</div>
```

### 导入组件

```tsx
import { Card } from "@/components/ui/card"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
```

### 数据表格模板

```tsx
<table className="w-full text-sm">
  <thead className="border-b-2 border-border bg-muted">
    <tr>
      <th className="text-left px-4 py-3 font-semibold text-xs uppercase">代码</th>
      <th className="text-right px-4 py-3 font-semibold text-xs uppercase">市值</th>
    </tr>
  </thead>
  <tbody>
    <tr className="border-b hover:bg-muted/50">
      <td className="px-4 py-3 font-mono font-semibold">AAPL</td>
      <td className="px-4 py-3 text-right font-mono">$1,250.50</td>
    </tr>
  </tbody>
</table>
```

