# 实现计划

1. 分类结果增加 skillUses（名称、置信度、路径）。保持首项兼容字段 skillName；读取与搜索分别归因。
2. 保守的 shell 静态解析器支持引号、命令边界、简单变量与 for-in 列表；未知控制流、替换、通配符与 here-doc 不提升为 inferred。
3. tool_calls 增加可空 JSON skill_uses 列，不生成虚假工具行。SQLite 与 JSONL 启动时只迁移没有新字段的旧 shell/read 行；原事件时间不变。
4. 共享 skillUsesForRow/countedSkillUses 统一 summary、by-name、provider、agent、project、day/hour 与 recent-skill 口径。SQL scope/filter 匹配数组。
5. Pi 嵌套 read/bash 复用规则；回放 `output.details.calls` 展开为原 id 的工具行，与独立 timeline 行去重。外层仅有脚本时只能提供 low 线索；有真实嵌套证据时外层保持 regular。
6. 从真实库快照记录旧值；复制库验证迁移后再重载当前插件，读取真实 RPC 与 pill label。
7. 增加现有后台回填版本，重新扫描活跃会话，补齐旧 codemode 的嵌套证据。归档会话沿用现有策略：只迁移已存 shell/read，不自动重扫其冻结 timeline。
