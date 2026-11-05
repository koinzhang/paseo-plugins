# 086 — research

## 上游源码锚点

- Paseo checkout：`/Users/koinzhang/Workspace/xws/paseo`
- 上游 commit：`8dfdb479a fix(terminal): start the daemon when the terminal worker cannot start (#8810)`（`packages/plugin/package.json` version 0.15.0）
- 已安装运行时：`paseo --version` → `0.15.0`
- 依赖目标：npm `@getpaseo/plugin@0.15.1`（latest），peer 要求 `@getpaseo/client` / `@getpaseo/protocol` 0.15.1

## 已验证结论

| 结论 | 依据 |
|---|---|
| 0.13 起 `agent.turn.after` 的 `timeline` 恒为空，需 `timeline.refetch` | `packages/plugin/src/server/lifecycle.ts`（`@deprecated Always empty`）；`public-docs/plugins/hooks.md` § agent.turn.after |
| `server.on` / `server.before` deprecated，旧事件名映射到新钩子名 | `packages/plugin/src/server/lifecycle.ts` `legacyEvents`（COMPAT 到 2027-04-30） |
| `addSurface` / `addSidebarItem` / `openSurface` deprecated | `@getpaseo/plugin@0.15.1` `dist/client/contracts.d.ts` |
| 面板 `context` / `agentId` deprecated，统一 `params` | `dist/client/contracts.d.ts` `PluginAgentPanelProps`；`public-docs/plugins/migration.md` § Panel props in 0.13 |
| `/client/react-native` 仅剩 deprecated `useRevealedText` 转发，UI 组件在 `/client/ui` | `dist/client/react-native.d.ts`（`export * from "./ui.js"`） |
| server 端 type-only 导入 `@getpaseo/client` 需本地安装 | `packages/server/src/server/plugins/compiler.ts` `Could not resolve type dependency`；`compiler.test.ts` |
| `@getpaseo/client@0.15.1` 自带 `ws` 依赖与 node transport | `packages/client/src/node/index.ts`、`daemon-client-websocket-transport.ts` |

## 开放问题

- activity / customize 的自研 i18n 仍只在 Web 读取 app 语言；迁移到 `defineTranslations` + `client.i18n` 可覆盖 iOS / Android，但需要重写 `shared/i18n.ts` 与全部注册文案，留待独立 spec。
- commands / inbox 继续 bundle `@getpaseo/client@0.15.1`，与宿主 0.15.0 daemon 协议为 patch 级差异；若后续 0.16 改动 daemon 协议，需要同步 `requirements.paseo` 下限。
