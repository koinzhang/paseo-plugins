# 017 · Plan

1. 新增只读插件 RPC `models.host`，返回 daemon 的稳定 serverId（`PASEO_SERVER_ID` 或 `$PASEO_HOME/server-id`）。client store 加载身份后发布通知；不新增 daemon 连接。
2. Web 适配器解析宿主 `/settings/hosts/<serverId>/...` Settings 路由，以身份匹配控制 Provider 弹窗。非当前主机只清理自身按钮，不复用他人的按钮。
3. 每实例标记按钮 owner，接管旧按钮时替换，点击仍以当前 provider/modelId 为键。监听 aria-checked 属性，在 MutationObserver 检查点恢复本机状态，阻止旧 bundle 覆盖后绘制错误状态。
4. 用实际适配器的 Chromium 回归检查混合新旧实例、按钮状态与点击归属、重排/新增、快速切换和卸载清理。

## 依据

上游 commit `30178c4f58b67f8472901356e1484022bd835de0`；本机 daemon `0.10.1`。`plugins/registry.ts` 每 host 运行 contribution；`server/server-id.ts` 持久化稳定 ID；`utils/host-routes.ts` 构造 `/settings/hosts/<serverId>/<section>`。公开插件 API 未向 entry 暴露 host ID，所以通过插件只读 RPC 取得。
