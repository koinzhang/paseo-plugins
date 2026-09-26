# 004 Rename targets

## 目标

`/rename` 默认修改当前 agent tab 的标题。用旗标改目标：`-t` / `--tab` 仍是当前 tab，`-w` / `--workspace` 修改当前 workspace 的标题。

## 参数

旗标只认标题前面的第一个词，后面整段（含空格）都是新名称。

| 输入 | 目标 |
|---|---|
| `/rename <title>` | 当前 tab |
| `/rename -t <title>` / `/rename --tab <title>` | 当前 tab |
| `/rename -w <title>` / `/rename --workspace <title>` | 当前 workspace |
| `/rename -- <title>` | 当前 tab；`<title>` 可以以 `-` 开头 |
| `/rename -w -- <title>` | 当前 workspace；`<title>` 可以以 `-` 开头 |

不用 `tab` / `workspace` 这种位置词。标题本身可以是 `workspace notes`，位置词会把第一个词当成目标。

短旗标好输入。长旗标写进用法和设置说明，避免只靠 `-w` 记忆。

缺标题、未知旗标都报用法，不发起修改。一次只指定一个目标。

## 非目标

- 不改 terminal、文件或其他非 agent tab。
- 不在一条命令里同时改 tab 和 workspace。
- 不用空标题清除 workspace 自定义名称。

## 验收

- [x] 无旗标与 `-t` / `--tab` 修改当前 agent 标题，保留内部空格。
- [x] `-w` / `--workspace` 修改当前 workspace 标题。
- [x] 缺标题和未知旗标有明确用法错误。
- [ ] 桌面 app 里 tab 与 workspace 名称即时更新。
