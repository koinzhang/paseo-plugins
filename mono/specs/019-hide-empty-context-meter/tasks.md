# 019 · Tasks

- [x] 设置项 `hideEmptyContextMeter` 与空圆环判定 — 验证：`npm test`
- [x] 修正嵌套 `:has()` 使整条 CSS 失效的问题，改为标记 `data-mono-empty-context` — 验证：Chrome 会丢弃含嵌套 `:has()` 的规则；typecheck
- [x] 重载 mono — 验证：`paseo plugin reload mono` 后 running。桌面 composer 需再看一次：无 token 时右下角圆环应消失
