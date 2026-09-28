# 020 — Research

- 上游源码锚点仍为 `49f9cec6be01ef7e7604dadf127425eac6493820`，本机 `paseo --version` 为 `0.9.2`；公开 SDK `providers.diagnostic` 与上一轮一致。
- Claude / Codex / Copilot / Pi / OMP 及 GenericACP 的 `getDiagnostic` 均输出 Version。GenericACP 的 `buildVersionProbeCommand` 会移除 ACP 模式参数；包 runner 保留包名参数，而非返回 npx/node 版本。
- 本机宿主诊断实测：Claude override `@tencent/tclaude 0.1.8`，Codex `codex-cli 0.157.1`，Cursor `2026.09.26-dd393fe`，Pi `0.87.1`，OMP `omp/18.3.5`；Copilot 未配置/不可用时为 unknown。
- fallback CLI 名根据上游 `provider-registry.ts`、`packages/app/src/data/acp-provider-catalog.ts` 核对；包 runner 安装不在本次范围，fallback 只调用本地已安装 CLI。
- UI 按 paseo-plugin-doc 的 reference-ui.md 使用 React Native 原语、theme.colors、layout.compact 和现有 Customize design tokens。原生 UI 检查工具本轮超时；本地 daemon 根 URL 不提供前端，继续定位网页验证入口。
- 真实扫描 RPC 验证六个已启用 provider 的版本均可获取：Claude/Codex/OpenCode/Pi 来源 host；Cursor/OMP 宿主诊断超过 5 秒时正确回退到 CLI，返回同样的版本格式。
- 本机已安装前端通过临时 localhost 服务可打开；连接 daemon 返回 Transport closed (1006)。上游 websocket-server.ts 会核对 Origin，默认允许 https://app.paseo.sh；未扩展允许来源或修改宿主配置。页面目视验收未完成。
- 用户追加要求：无法探测/解析时隐藏版本区域；有效版本统一 `v` 前缀，原始版本数据仍不带前缀，以保持 OpenCode major version 判断。
