# 001 · Tasks

- [x] 插件骨架：`paseo-plugin.json`（id `mono`，`paseo >=0.9.0`）、`package.json`、`tsconfig.json` — 验证：`npm run typecheck`
- [x] 调色板 `shared/palette.ts`（冷纸 / 墨色）+ `index.client.ts` 注册两个主题 — 验证：`npm test`
- [x] CI matrix 加入 `mono` — 验证：`.github/workflows/ci.yml`
- [x] 本地安装 — 验证：`paseo plugin install "$PWD"` 后 `paseo plugin ls` 为 running
- [ ] 视觉验收：Settings → Appearance 切换 Mono Dark / Mono Light（需人工）
