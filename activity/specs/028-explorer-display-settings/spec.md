# 028 — Explorer Agents 显示偏好全局持久化

- 状态：已实现
- 日期：2026-09-19
- 依赖：025 / 026 / 027

## 1. 目标

| ID | 目标 |
|---|---|
| G1 | Agents 设置菜单的 **Sort / Group / Show / Status / Lifecycle** 写入 host-scoped plugin settings，跨 workspace、插件 reload、daemon 重启后保持 |
| G2 | 默认值：sort=`updated`，group=`none`，show=`[]`，status=`[active]`，lifecycle=全选 |

## 2. 非目标

- 不持久化 Skills/MCP 排行切换（`rankKind`）
- 不做 per-workspace 覆盖
- 不新增独立 Settings 屏（菜单内即时 `save`）

## 3. 口径

- `defineSettings({ id: "explorer-agent-display", scope: "host", version: 1 })`
- `server.registerSettings`；客户端 `useSettings`；变更时 `save(完整 document, revision)`
- `loading` / 非 `ready` 时用 schema 默认值渲染，不把默认值当成已落盘

## 4. 验收

- [x] 改筛选 → reload 插件 / 换 workspace 仍保留
- [x] typecheck / reload
