# 015 · Research

- 用户实测：关闭 Mono 后 draft agent 打开 Codex / GPT-6-Sol 模型选择不卡住。
- 现场：Renderer CPU 约 107%，daemon 约 0.3%；三秒 sample 大量停留在 V8 微任务。
- 上游 `/Users/koinzhang/Workspace/xws/paseo` commit `49f9cec6b`；诊断时 CLI `paseo --version` 为 `0.9.1`，Desktop / daemon 已运行 `0.10.0-beta.1`。
- `packages/app/src/plugins/registry.ts` 的 `byHost` 和 `installCatalog` 会为每个 host 分别运行 client contribution；所有实例共享 app document。
- Chromium 隔离复现：转译实际 `client/model-visibility-web.ts`，同一 `model-provider-codex` 总数为 7，实例 A 隐藏 4 个、实例 B 隐藏 0 个。设置安全微任务限额 200 后得到 `{ microtasks: 202, capped: true, mutations: 202 }`；不设限会连续在 3 / 7 间改写。
