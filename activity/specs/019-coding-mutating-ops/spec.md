# 019 — Coding 收紧为写盘操作

- 状态：已实现
- 日期：2026-09-19
- 依赖：014（file write）、018（agent 二分 + 空会话排除）

## 1. 背景

018 把任意 shell / file read 也算 coding，偏松。产品改为：**只有改盘才算 coding**；纯读、只聊天不算。

Shell 无侧信道，只能靠命令启发式；策略为**覆盖常见开发写盘**（可有少量假阳性，优先少漏常见写盘）。

## 2. 目标

| ID | 目标 |
|---|---|
| G1 | `isCodingOp`：`isFileWrite` **或**（`isShellCall` ∧ `shellLooksMutating(command)`） |
| G2 | **不算** coding：file read、非写盘 shell（如 `ls`/`cat`/`git status`）、仅 message/skill/MCP |
| G3 | 018 空会话排除与 chat 定义不变；分母仍为 coding+chat |
| G4 | 白名单覆盖常见开发写盘：文件类命令、包管理、构建、写盘 git 子命令、重定向 |

## 3. 非目标

- 不解析完整 shell AST
- 不保证 `python script.py` 等任意脚本写盘（无名单则可能低估）
- 不改 KPI Shell/File 计数本身

## 4. `shellLooksMutating`

```text
true if:
  command matches />|>>|\|\s*tee\b/i
  OR head ∈ MUTATING_HEADS   // 见 plan
  OR head === "git" ∧ first non-flag subcommand ∈ GIT_MUTATING_SUBS
  OR head === "sudo" ∧ shellLooksMutating(rest)
```

低估可接受；名单可后续增补。

## 5. 验收

- [x] file write/edit/delete → coding
- [x] file read only → chat（若有活动）
- [x] `git status` / `ls` / `cat` → 不因 shell 变 coding
- [x] `rm` / `npm install` / `git commit` / `echo x > f` → coding
- [x] 空会话仍排除
- [x] `npm run typecheck`、`npm test` 通过
