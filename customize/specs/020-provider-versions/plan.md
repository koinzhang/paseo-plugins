# 020 — Plan

- 将 `server/opencode-version.ts` 抽为 `server/provider-version.ts`，探测函数显式接收 ProviderId；OpenCode 保持严格的输出解析，其他 provider 支持各家已核实格式。
- 本地 fallback 使用固定的已知 CLI 名（Cursor → cursor-agent、CodeBuddy Code → codebuddy、Kiro → kiro-cli、Qwen Code → qwen）；仅 `--version`，不调用 npx/bunx/uvx 下载软件。
- `handleScan` 对所有 provider 探测并保存 ProviderVersion；仍仅在当前 provider 实际扫描时查询，不全量阻塞页面。
- 快照格式升级到 4，触发一次完整刷新。版本探测保持宿主 5 秒、CLI 3 秒边界。
- 顶部将兼容图标、版本 Text、Provider Dropdown 组合；外层允许换行，保持这个组合的内部顺序。仅在存在有效版本时渲染 Text，并添加 `v` 前缀；不渲染 unknown 占位。使用 `TEXT.meta` / `foregroundMuted`；版本单行可缩短，限制最大宽度。
- 移除机制说明里的已检测版本/来源，把未知版本提示保留在 OpenCode skills 行为说明中；补齐 i18n、README、spec 索引及任务验证记录。
