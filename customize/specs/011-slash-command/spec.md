# 011 — `/customize` slash command

## 目标

- 在 agent composer 输入并提交 `/customize`，打开 Customize surface；命令文本不发送给 agent。
- 当前 agent 的 provider 能映射到 Customize 支持的 provider 时，更新看板 Provider；当前 workspace 有 project root 时，更新看板 Project。两者独立处理。
- 缺失或不受支持的值不更新对应选择；两个值都不可用时只打开看板。
- 不改变侧栏和 Command Center 的现有入口。

## 验收

- `/customize` 在 agent composer 中可见、可提交。
- 有效上下文使看板选择当前 agent provider 和 workspace project root；只有一个值可用时只更新该值，保留另一个选择；两个值都不可用时只导航。
- 设置读写失败时仍打开页面；设置更新遵循当前 revision，不覆盖并发写入。
