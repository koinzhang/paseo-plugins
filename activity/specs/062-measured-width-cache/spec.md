# 062 — 测量宽度：隐藏窗口 / 隐藏页面下不再重排

- 状态：已实现，页面验收待完成
- 日期：2026-09-21
- 依赖：003（热力图 onLayout 测宽）、059（Timeline 一屏 24 小时）、060（section 节奏）

## 1. 现象

从其他页面切回 Activity 时，热力图会「重排一下」：网格先塌成空、再撑开。
数据层没有参与——查询走宿主 QueryClient 缓存（009 / 044），切回来不重新拉数、也不转圈。

## 2. 实测（临时 trace：客户端 → 插件服务端日志，已移除）

在 `paseo plugin logs activity-dev` 上观察到：

| 观测 | 值 | 含义 |
|---|---|---|
| 存活的 surface 实例 | 20 | 切页面**不卸载**，宿主把离开的页面留在树里（19 个 `dom: 0`） |
| 可见实例的 DOM 宽 / state 宽 | `dom: 740` / `width: 0` | 元素已布局，但 `onLayout` 从没报过 |
| 可见实例的格子宽 | `cell: 0` | `cellSize = 0`，364 个格子全是 0×0 |
| `document.visibilityState` | `hidden` | 窗口被遮挡 / 最小化时渲染器不跑渲染更新 |
| 自己挂的 `ResizeObserver`（root 与 body） | 回调 0 次 | 不是宿主的问题：RO 本身就不回调 |

两条独立成因：

1. **隐藏的页面会报 0 宽**：宿主隐藏离开的页面（0 宽容器），`onLayout` 收到 `width: 0`，
   `cellSize` 归零；切回来再报真实宽度 → 塌陷 + 撑开 = 肉眼所见的重排。
   模块级宽度缓存也因此被 0 覆盖，重挂载时反而从 0 起画。
2. **窗口不可见时 `onLayout` 根本不触发**：Chromium 在隐藏/被遮挡的窗口里不做渲染更新，
   ResizeObserver（`onLayout` 的实现）不回调——而 `getBoundingClientRect()` 强制布局仍能拿到 740。
   于是窗口重新可见后的第一帧才是「第一次测量」。

## 3. 目标

| ID | 目标 |
|---|---|
| G1 | 0 宽上报不改变已测得的宽度：隐藏不塌陷，切回不重排 |
| G2 | 重挂载首帧用上次真实宽度起画（缓存不被 0 污染） |
| G3 | 窗口从隐藏变可见、以及窗口尺寸变化时，在下一帧绘制前重新测量 |
| G4 | 非 web 宿主（没有 DOM）仍走 `onLayout`，行为不变 |

## 4. 非目标

- 不改查询 / 缓存 / 轮询
- 不改热力图的 min / max 格子尺寸与窄屏横向滚动策略（003 既定）
- 不改 KPI `StatTile` 的自适应字号（`fitFontSize` 在 `available <= 0` 时回落到 `base`，
  多数 tile 首帧已是最终字号；按 tile 记忆宽度需要 label + 布局变体做 key，跨 surface 会引入陈旧宽度）

## 5. 行为

`client/measured-width.ts` 的 `useMeasuredWidth(key)` 返回 `[width, ref, onLayout]`：

- `apply(next)`：`next > 0` 才写入 state 与模块级缓存；0（隐藏容器 / 未布局）直接忽略
- `useState(() => widths.get(key) ?? 0)`：重挂载从上次真实宽度起画（首次挂载仍是 0）
- `useLayoutEffect`：挂载时同步读 `ref.current.getBoundingClientRect()`；并监听
  `resize` 与 `visibilitychange` 重新测量 —— 都在下一帧绘制前落地
- `onLayout` 保留：没有 DOM 的宿主（`getBoundingClientRect` 不存在）只走这条路径
- 热力图 key `global:heatmap`、Timeline key `global:timeline`，两个根节点都挂 `ref` + `onLayout`

## 6. 取舍

宽度变成 0 时保留旧值：若容器真的缩到 0（且不是隐藏而是可见的 0 宽），网格会按旧尺寸绘制并
可能溢出。实际形态里 0 宽只出现在宿主隐藏页面（`display: none`，不参与绘制），代价可接受。

## 7. 验收

- [x] trace 实测：修复后可见实例 `width: 740`、`cell: 11`，且此时 `visibilityState` 仍是 `hidden`、
      `roRoot/roBody` 仍为 0 —— 说明同步测量生效，不再依赖 `onLayout`
- [x] `npm run typecheck`、`npm test` 212 pass；`paseo plugin reload activity-dev` 后 running
- [x] 临时 trace（`usage.debug-log` RPC、`client/debug-trace.ts`、探针）全部移除
- [ ] 目测：切回 Activity 首帧即完整，热力图不再塌陷重排；窗口从后台切回时同样不重排
