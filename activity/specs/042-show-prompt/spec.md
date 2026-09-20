# 042 — Show：Prompt（最新用户消息）

- 状态：已实现（待真机）
- 日期：2026-09-20
- 依赖：025（Show 字段）、040（latest user message preview）

## 1. 背景

Explorer Agents 行 Show 菜单已有 Provider / Calls / Messages / Updated。Messages 是消息**计数**；用户希望可选展示**最新一条用户消息**预览，与 attention popover 同源。

## 2. 目标

| ID | 目标 |
|---|---|
| G1 | Show 增加单选开关 **Prompt**（单词语；与 Messages 并存） |
| G2 | 勾选后，行 meta 展示该 agent 最新非空 `user_message` 预览（host timeline；`formatMessagePreview`） |
| G3 | 与其它 Show 字段可组合；meta 用 ` · ` 拼接；Prompt 排在字段列表末尾 |
| G4 | 未勾选时不拉取 timeline；勾选后仅当前页可见行请求（react-query，与 040 同 key） |

## 3. 非目标

| ID | 非目标 |
|---|---|
| NG1 | 改名 Messages → Message count |
| NG2 | 把用户消息写入 usage.db |
| NG3 | 多行展开 / 点击 Prompt 跳转消息位置 |
| NG4 | 展示助手回复 |

## 4. 口径

- 标签：**Prompt**；内部 id：`prompt`
- 数据：复用 `fetchLatestUserMessagePreview` / `useLatestUserMessagePreview`（projected → canonical）
- 加载中：meta 片段为 `…`；失败 / 无用户消息：该片段省略（其它 Show 字段仍可显示）
- 默认：不选（与其它 Show 一致）

## 5. 验收

- [ ] Show 菜单出现 Prompt；勾选后行副文案出现最新用户消息预览（待真机）
- [ ] 与 Messages 同时开：可见 `N messages · <preview>`（待真机）
- [x] typecheck / test / reload → running
