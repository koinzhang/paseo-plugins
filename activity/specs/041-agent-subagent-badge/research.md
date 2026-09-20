# 041 — research

## 现象

`e59c28e7-91f6-4571-b182-56c9b93116c6` 本地 `agents` 表有 2 条 `parent_agent_id` 指向它的子会话，但 Explorer 角标不显示。

## 原因

1. 初版只从 host `agents.list` 状态图读 `parentAgentId`。
2. 该字段在目录快照上经常是 `null`；真实关系在 label `paseo.parent-agent-id`（agent-crew 已做同样回退）以及本地 registry（`agent.created` hook 写入）。
3. `inspect` CLI 能看到 `ParentAgentId`，但 list 路径不可靠。

## 结论

角标计数改以 `usage.agents` / 本地 registry 为准；host 侧仍解析 label 以便状态图一致。
