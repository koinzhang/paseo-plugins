# 019 — Research

- OpenCode [v2 skills 官方文档](https://opencode.ai/v2/docs/skills/#frontmatter)：`metadata.opencode/autoinvoke: false` 隐藏模型可用列表，但 skill 仍注册、可以按 ID 显式加载。路径决定 ID，frontmatter name 只是显示名。v2 `permissions[]` 以 action / resource / effect 表达规则，末个匹配获胜。
- [v1 skills 官方文档](https://opencode.ai/docs/skills/) 仍使用 `permission.skill`，没有此单 skill 自动发现开关；不将其他 provider 的 `disable-model-invocation` 映射为 OpenCode 开关。
- Paseo 源码锚点：`49f9cec6be01ef7e7604dadf127425eac6493820`；本机 `paseo --version`：`0.9.2`（plugin ls 报告 daemon `0.10.0-beta.1`）；`opencode --version`：`opencode v2.0.18`。
- `packages/protocol/src/messages.ts` 的 ProviderSnapshotEntry / ProviderAvailability 不含版本。公开 `PaseoApi.providers.diagnostic` 返回诊断文本；`packages/server/src/server/agent/providers/opencode-agent.ts#getDiagnostic` 调用 `buildBinaryDiagnosticRows`，输出 `Version`，且使用宿主实际配置的命令与 runtime env。优先宿主诊断可避免直接 PATH CLI 与 override 不一致。
- `packages/plugin/src/server/contracts.ts` 的 PluginHandlerContext 提供 paseo；已安装 `@getpaseo/plugin@0.9.1` 也具备此公开契约，无须提升最低版本。
- 本轮实际调用 `paseo provider diagnostic opencode --json`，只提取 Version 行，得到 `Version: opencode v2.0.18`，约 1.9 秒返回；与直接 CLI 结果一致。
- 官方 Paseo 线上 docs 本轮无法通过 web 工具获取，已对照本仓库 paseo-plugin-doc 的 SDK/RPC、运维文档和本地上游源码。
- 直接 CLI fallback 使用 daemon 进程 PATH / 环境；宿主 override 不可读且 PATH CLI 不同的情况下，fallback 版本只代表该 CLI，来源在加载机制说明中明确展示。
- 重载后的实际 `customize.scan` RPC 验证：`providerVersion = { version: "2.0.18", source: "host" }`；User 143 个 skill 中 132 个带该字段并显示 manual，包含 archify / code-review / grilling；缓存 RPC 返回 fresh，版本与来源保留。
