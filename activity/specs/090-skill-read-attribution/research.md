# 验证记录

## 环境与依据

- 日期：2026-11-28；运行时 / CLI：Paseo 0.18.1；插件 SDK：0.17.4（本次不升级依赖）。
- 同级只读 Paseo checkout：`1ff119dc2a42825e7fdc46c504b6ccee52a4f8be`。
- Codex `providers/codex/tool-call-mapper.ts` 将 commandExecution 映射为 shell；Pi `providers/pi/tool-call-mapper.ts` 将 read.path / bash.command 映射为 read / shell。
- 当前公开文档：`https://paseo.sh/llms.txt`、`https://paseo.sh/docs/plugins/reference.md`。本次不引入新的宿主 UI API。
- `codex features list` 实测 code_mode / code_mode_only 均为 false；Pi settings 只读确认 defaultTools 包含 +codemode，codemode.mode 为 only。
- 示例 agent `67e050b8-2202-4e57-8f37-4791fb610448` 实测 provider=codex、model=group/gpt-6.2-sol、thinking=high。

## 独立确认的根因

1. 旧分类器把所有 shell Skill 读取设为 low；正常统计只计算 exact + inferred。因此 Codex 有记录却没有正常 Skill 次数。
2. 旧命令匹配和行模型只保留首个 Skill，批量读取会少计。
3. buildSkillRoots 仅展开为绝对路径，会漏掉 Pi 的相对 `.agents/skills/...` read 与跨物理位置的常见 Skill 根目录。保留默认根模板与已展开根目录共同匹配。
4. Pi 的实时数据可能已有 `/1` 嵌套行，但 canonical 回放只返回 codemode 外层。真实输出 `detail.output.details.calls` 含原嵌套 id、name、JSON args、status；旧采集忽略了这份执行证据。

## 固定 SQLite 快照对比

对在线库做 SQLite backup，再复制一份运行启动迁移。比较相同快照，不把在线新增调用误当成修复收益。

| 指标 | 旧值 | 修复后 |
|---|---:|---:|
| 全库工具行 | 159509 | 159509 |
| 全库 MCP 行 | 2360 | 2360 |
| Codex 工具行 | 37824 | 37824 |
| Codex 可靠 Skill 使用 | 0 | 3171 |
| Pi 工具行 | 56828 | 56828 |
| Pi 可靠 Skill 使用 | 637 | 1282 |
| 示例工具行 | 248 | 248 |
| 示例可靠 Skill 使用 | 0 | 12 |

所有行的 agentId/callId、ts、ingestedAt、status、command 对比：0 项变化。正常 Skill 使用单位是每条工具调用的不同 Skill，不等同于工具行数。修复后仍保留 Codex 2142 / Pi 640 条低置信度 Skill 线索；多 Skill 线索拆分后不能直接和旧 low 工具行数比较。

示例可靠 Skill：subrepo-context 4、aipay-harness 3、ego-browser 2、a2a-cli 1、gongfeng 1、paseo-worker 1。另有 8 次 low 线索，不进入正常总数。

## 真实 RPC 与 Pi 回放

- 通过安装的 SDK `createHostClient` / `invokePluginRpc` 查询在线 Activity，不修改凭据或配置。
- reload 前，`usage.skills-by-name` 所有 total=0，MCP=38，pill label 为 `Paseo.Get Agent Status + 7`。
- reload 后，真实 `usage.skills-by-name` 返回上述 6 个正常 Skill，`usage.summary.skillCalls={exact:0,inferred:12,low:8}`。此时在线已新增调用，MCP=49；pill label 为 `Paseo.Get Agent Status + 14`。pill 仍按最近 Skill 或 MCP 选择名称，不强制把最近 MCP 替换成 Skill；popover 数据已包含真实 Skill。
- Pi agent `d8a934b0-9874-4b83-8b2f-548d263c7b26` 的真实 canonical 返回 codemode `chatcmpl-tool-bbcbb7e416996aa0`，无独立 read timeline 行。输出 details.calls 中 read id 为 `chatcmpl-tool-bbcbb7e416996aa0/1`，args.path 为 `/Users/koinzhang/.pi/agent/skills/ego-browser/SKILL.md`，status=ok。
- 用捕获的真实 item 运行 ingestTimeline：外层 regular，展开原 `/1` read，ego-browser=inferred。在线库原 `/1` 行也保留且为 inferred。该示例已归档，未对其做自动 timeline 重扫。

## 验证与边界

- `npm run typecheck`：通过。
- `npm test`：291 项通过，0 失败；包含分类、多 Skill、变量循环、混合 low、SQLite/JSONL、旧 schema 升级、时间保留、Pi canonical / explicit 嵌套去重、后台版本失效及各聚合面。
- `git diff --check`：通过。
- `paseo plugin reload activity`、`paseo plugin ls activity`：running；日志显示 SQLite ready / Plugin ready，无初始化错误。
- 重载后 checkpoint 文件 version=2，已完成 15 个活跃会话的版本回填；末次真实 RPC 再次确认示例 reliable=12、6 个正常 Skill、low=8。
- 保留 089 composer pill 设置改动；相关测试仍通过。没有 commit、push、tag、发版、Paseo 源码或全局配置修改。
- 示例首轮命令的 shell display 引号已经损坏；真实 canonical 也返回相同损坏文本。不能安全还原的循环仍为 low。正常字面量 for-in 循环单测可展开多个 Skill，不推测动态表达式或损坏脚本的实际执行。
- 仅有外层脚本、没有 output.details.calls 的 codemode 不足以证明执行，保持 low。
- 归档会话遵循现有 registry-only 回填策略，已存 shell/read 迁移完成，但未承诺补齐所有归档 codemode 历史。
- 已验证真实 RPC 和同源 label；未人工点击桌面/移动端 pill 或 popover。客户端刷新后可核对列表中的 6 个 Skill，最近 MCP 仍可作为 pill 标题。
