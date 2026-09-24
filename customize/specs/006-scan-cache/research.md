# 依据

- Paseo 源码 `packages/app/src/plugins/registry.ts`：每个插件安装实例有独立 `QueryClient`；相同 client bundle 更新时保留实例，移除或替换时清理其查询缓存。查阅锚点：Paseo commit `49f9cec6be01ef7e7604dadf127425eac6493820`，CLI `0.9.1`。
- Paseo 源码 `packages/app/src/plugins/settings/use-settings.ts` 与 `packages/app/src/data/query.ts`：`useSettings` 使用 replica query，`gcTime: Infinity`，因此页面再次挂载时既有选择可从缓存恢复。查阅锚点同上。
- Customize 原扫描查询已有 `["customize", "scan", provider, projectRoot]` 键；React Query 按键隔离结果。`refetchOnMount: "always"` 在页面或查询键重新激活时刷新，`gcTime: Infinity` 保留非活动数据。新增 QueryObserver 测试覆盖缓存显示和刷新失败后数据留存。
