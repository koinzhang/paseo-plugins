# Plan

## 参数

`shared/commands.ts` 的 `planRename(args)` 返回 `{ target: "tab" | "workspace", title }`。

1. trim 后为空 → 用法错误。
2. 第一个词是 `-t` / `--tab` / `-w` / `--workspace` → 选定目标，其余为标题。
3. 第一个词是 `--`，或选定目标后再遇到单独的 `--` → 丢掉 `--`，其余为标题。
4. 其他以 `-` 开头的第一个词 → 未知选项。
5. 否则整段是当前 tab 的标题。

标题再 trim 一次；结果为空则用法错误。内部空格保留。

## 数据流

```text
/rename args
  planRename(args)
    tab       → rpc commands.agent.control { op: "rename", agentId, title }
                → DaemonClient.updateAgent
    workspace → paseo.workspaces.ref(workspace.id).setTitle(title)
```

Workspace 写入走公开 SDK，与 `/resend` 相同，不新增 RPC。Tab 写入沿用 001 的 daemon 连接。

## 文件

- `shared/commands.ts`：解析
- `client/commands.ts`：`/rename` 改为 direct execute
- `shared/commands.test.ts`：旗标、缺省、错误
