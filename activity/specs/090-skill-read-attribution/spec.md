# 090 — Skill 读取归因

## 目标

Codex shell 与 Pi read/bash/codemode 的直接 Skill 读取，按同一证据规则进入统计。每条工具调用可包含多个 Skill；不通过提升所有 low 或修改 UI 掩盖采集错误。

## 行为

- 显式 Skill 工具为 exact；字面量 SKILL.md 的 read、cat、sed -n 打印、head、bat 为 inferred。路径须匹配 Skill 根目录。
- 常见字面量变量赋值与 for-in 循环可静态展开，不执行用户脚本；动态表达式、搜索、仅提到路径、写文件保持保守。
- 一条调用对同一个 Skill 最多计一次，不同 Skill 分别计数；工具调用总数仍按真实 callId 计数。
- Pi 已暴露的嵌套调用优先；只有外层 codemode 时，静态字面量工具调用仅记 low，不当作已执行读取。
- Pi 回放的 `codemode.detail.output.details.calls` 是真实嵌套调用证据：解析 read/bash 的 args，按原嵌套 id 入库。与单独暴露的嵌套 timeline 行去重，外层不再重复归因。
- low 单独保留，不进入 pill、KPI、热力图与正常 Skill 调用数。
- 启动升级已有 shell/read 记录，保留 callId、时间、状态、消息、MCP 与原有设置。

## 非目标

不执行任意 shell/JavaScript，不改变 provider/全局配置，不修改 Paseo，不发版或提交。

## 验收

分类、嵌套采集、多 Skill 聚合、SQLite/JSONL 存储、历史迁移均有回归测试。真实示例 agent 的 RPC 与 pill label 非空；typecheck、全量测试、reload/running 完成并记录证据。
