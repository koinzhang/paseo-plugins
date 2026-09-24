# 011 · Plan

Paseo `addTheme` 接收 8 色基础调色板：`background`、`foreground`、`raised`、`control`、`border`、`accent`、`mutedForeground`、`ring`。宿主映射为 `surface0`～`surface4`、文字和交互 token，并按 Light / Dark 派生状态色。

| 宿主输入 | Light | Dark | 角色 |
| --- | --- | --- | --- |
| background | `#FFFFFF` | `#0A0A0A` | 页面背景 |
| raised | `#FAFAFA` | `#111111` | 卡片 / 弹层 |
| control | `#F5F5F5` | `#171717` | 控件 / 更高层级 |
| border | `#E5E5E5` | `#262626` | 细边框 |
| ring | `#D4D4D4` | `#404040` | 焦点圈 / 强边界 |
| mutedForeground | `#737373` | `#A3A3A3` | 次要文字 |
| foreground | `#171717` | `#EDEDED` | 正文 |
| accent | `#171717` | `#EDEDED` | 主交互填充 |

更新现有测试的色相约束和公开文案。保留 Mono 主题 ID，避免重置用户的已选主题。
