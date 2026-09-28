# 026 — Tasks

- [x] 操作栏底部间距
  - 验证：`client/surface.tsx` 操作栏容器增加 `paddingBottom: titleGap(compact)`；`npm run typecheck`、`npm test`（70 项）通过；`paseo plugin reload customize` 后 running，日志无报错。页面目视验收待完成（滚动到中部时内容与操作栏之间保留空白，列表 / 卡片一致）。
