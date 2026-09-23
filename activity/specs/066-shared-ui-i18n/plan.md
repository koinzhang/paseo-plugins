# 066 — Plan

## 1. 公共组件（`client/ui.tsx`）

| 组件 | 规格 |
|---|---|
| `IconButton` | `iconButton` 样式 + `hitSlop` + `accessibilityRole="button"`；支持 `expanded` / `disabled` / `busy` |
| `SectionHeader` | `sectionTitle(compact)` 标题 + 右侧 children（动作按钮） |
| `Section` | 标题 → 内容 `titleGap(compact)` |
| `LoadingState` | `ActivityIndicator color={accent}` |
| `ErrorState` | `TEXT.small` `statusDanger`「加载失败：原因」+ accent「重试」，`accessibilityRole="alert"` |
| `InlineEmpty` / `PageEmpty` | 行内空 / 整页空（065 §7） |
| `TextTabs` | `variant: "filter"`（Global 范围）/ `"chart"`（图表内模式），`tablist` 容器 |
| `CountText` | 右对齐等宽计数（`TEXT.count`） |
| `ChartTooltip` | 自测尺寸；水平以 `anchorX` 居中并夹在容器内，垂直在 `anchorY` 上方 8px；`clampTop=false` 允许越过图表顶部 |

## 2. 图表

| 图表 | anchor | 行 |
|---|---|---|
| 热力图 | 格子中心 / 格子顶 | Messages · Agents · Skills · MCP |
| 直方图 | 柱中心 / 0（图表顶） | 各 provider（品牌色块） |
| Timeline | `index * slot - scrollOffset` / 绘图区顶 | Messages（accent）· Agents（agentStroke）· Skills · MCP |

## 3. i18n

- `shared/i18n.ts`：`APP_LANGUAGES`（与 Paseo 设置一致）、`resolveAppLanguage(setting, systemLanguages)`、`messagesFor(locale)`（按 locale 缓存）
- 文案表是工厂 `({ num }) => Messages`，数字按 locale `toLocaleString`；`Messages = ReturnType<typeof en>`，zh-CN 表类型强制完整
- 共享纯函数（`buildActivityInsights` / `buildActivityKpi` / `formatDuration` / `formatAgentMeta`）接收 `locale`
- `client/web.ts`：读 `@paseo:app-settings`；同窗口写 localStorage 不触发 `storage` 事件，故每 1.5s 轮询 + `storage` / `focus` / `languagechange` / `visibilitychange`；首个订阅者启动、最后一个退出时清理
- `client/use-app-language.ts`：`useAppLanguage()`（`useSyncExternalStore`）、`useMessages()`；非 React 的 `currentAppLanguage()` / `watchAppLanguage()`
- 注册类入口：`addCommandCenterItem` 无 `update()`，语言变化时 remove + 重新注册；attention pill 用 `pill.update` 重置标题
- `FormattedTime` 的 `prefix` 改为 `format(stamp)`，词序交给文案表（`最近 3 分钟前` / `Last 3m ago`）

## 4. 浮层宽度

`design-tokens.ts`：`POPOVER_WIDTH = { min: 300, max: 380 }`、`popoverFrame(compact)`；Usage / Attention popover 共用。
