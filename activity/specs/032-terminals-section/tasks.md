# 032 — tasks

- [x] T1 spec / plan / README 索引 — 验证：文件存在
- [x] T2 `terminal-preview.ts` + 单测；package.json test script — 验证：`npm test` 146 pass
- [x] T3 `terminals-section.tsx` + panel 查询 / 样式接线 — 验证：typecheck；host SDK list/capture 已实测（create → list → capture → kill）
- [x] T4 `npm run typecheck` / `npm test` / `paseo plugin reload activity` — 验证：reload running，日志无报错
- [x] T5 关闭按钮 + 8 行预览 — 验证：typecheck；kill 语义已实测（kill → list 0）
- [x] T6 cwd `~` 折叠（`usage.host-info` + shared `collapseHomePath`）— 验证：typecheck / `npm test` 146 pass
- [ ] T7 真机：区块出现 / 展开最新 8 行 / 关闭移除 / cwd 显示 `~`（待用户目视确认）
