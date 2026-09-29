# Plan

- 契约：`ItemSort = "starred" | "created" | "updated" | "name"`；`items.list` input 增加 `sort?`（默认 `updated`）；`AgentSnapshot` 增加可选 `createdAt`，`lookupAgent` 从 `agent.createdAt` 填入。
- Store：SQL 仍按 `pinned DESC, updated_at DESC, id` 取出；`sort` 不是 `updated` 时在内存中稳定排序（条目量小，名称排序需要与 client 一致的标题逻辑）。
- `shared/item-title.ts`：`itemTitle` 从 client 移入 shared，client 列表与 server 名称排序共用。
- Client：`InboxView` 在非 workspace 模式下渲染排序按钮（`ArrowUpDown` + 当前排序名），点击按 `SORTS` 顺序循环切换。
- 布局：列表栏 `overflow: hidden`，搜索框 `flex: 1, minWidth: 0`，避免工具栏越过分割线。分割线改为独立的 9px 拖动区（native 用 `PanResponder` 且拒绝 termination；web 在 grant 时改由 `client/web.ts` 的 `trackHorizontalDrag` 在 `window` 上跟踪 mousemove / mouseup，按 requestAnimationFrame 合并更新，拖动期间 body 设 `cursor: col-resize` + `user-select: none`——只靠 responder 时指针离开细把手或经过其他 view 就会丢失拖动；负 margin 保持视觉 1px），宽度 clamp 在 280–640，存模块变量以便重开 surface 时保持。
