# 019 — Plan

- 新增 server 版本探测模块：严格解析 semver 及 `opencode v...` 输出，只读宿主诊断的 `Version` 行；宿主最多等待 5 秒，CLI 使用 `execFile`（无 shell），3 秒超时、32 KiB 输出上限。探测结果包含 version 与 host / cli / unknown 来源。
- `handleScan` 使用现有 handler context 的 Paseo SDK；仅 OpenCode 调用版本探测。通过可选 `ScanEnv.providerVersion` 把结果传给同步 scanner，便于独立 fixture 验证。
- `scanRpc.output` 增加可选版本信息并保存到快照；快照格式升级到 3，避免旧状态留在页面上十分钟。每次实际扫描重新探测，不增加独立的版本永久缓存。
- OpenCode scanner 保留禁用优先级，在已许可分支按版本与 metadata 设置 manual / pending / auto；v2 权限使用文件路径 ID，不以 display name 匹配。
- `mechanismFor` 接受可选版本信息，更新 OpenCode skills 中英文说明；沿用现有调用方式筛选，无新增 UI 控件。
- 更新 README、新 spec 索引与任务记录；增加版本探测和 scanner 回归测试，执行全量 Customize 测试与 typecheck 后重载。
