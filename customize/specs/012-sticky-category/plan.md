# 012 — Plan

- 去掉按 Provider 保存的 `lastCategory`。分类只保留一份当前选择。
- Provider 变化时用 `resolveCategory` 校正：当前分类仍可见则保持，否则改为该 Provider 可见分类的第一项。
- Project 变化不触发分类校正。
- 用现有可见性测试覆盖“仍可见则保持”和“不可见则第一项”。
