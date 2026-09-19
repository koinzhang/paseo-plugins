# 007 tasks

## Phase 1 — 展示名 Activity（id 仍为 tool-usage）

- [x] T1 更新 Spec 文档与 AGENTS / specs/README
- [x] T2 `index.client.tsx` 侧边栏 / panel / Command Center 文案 + keywords
- [x] T3 popover / panel UI 标题；export markdown 标题 `# Activity report`
- [x] T4 交叉更新用户可见名
- [x] T5 reload；侧边栏显示 Activity

## Phase 2 — 插件 ID `activity`

- [x] T10 选定最终 id = `activity`；迁移说明写入 spec/plan
- [x] T11 `resolveActivityDataDir` + `paseo-plugin.json` / surface / logs / package name
  - 验证：`server/migrate-data.test.ts`；`npm test` / `typecheck`
- [x] T12 文档 / CLI（AGENTS、specs/README、007）；checkout 目录改名为 `activity`
- [x] T13 升级路径：`remove tool-usage` → `install` 新路径；确认 `plugin-data/activity` 含原库且旧目录消失

## 发布（npm 名偏差，见 spec §8）

- [x] T14a 本地 `package.json`：name → `@koinzhang/paseo-plugin-activity`，移除 `private`，补 `files` 白名单
  - 验证：`npm pack --dry-run` — 47 files / 58.4 kB，含 `paseo-plugin.json` 与 `client/`、`server/`、`shared/`，无 `specs/`、`docs/`、`.agents/`
- [ ] T14b 登录 npm 后 `npm publish --access public`；`paseo plugin install npm:@koinzhang/paseo-plugin-activity` 验证 `paseo plugin ls` 的 id 仍为 `activity`
