# 019 — OpenCode v2 skill 自动发现

## 目标

- 优先通过宿主 `providers.diagnostic("opencode")` 的 `Version` 行判断版本；宿主不可用、失败、超时或版本不可解析时，再运行 daemon 主机上的 `opencode --version`。
- 已确认 OpenCode >= 2 时，`SKILL.md` frontmatter 的 `metadata.opencode/autoinvoke: false`（布尔值或字符串 `"false"`）显示为 `manual`，原因显示原始字段。
- 该规则同时适用于原生与兼容 skill 目录；模型可用列表隐藏不等于禁止按 ID 显式加载。
- v1 忽略这个 v2 字段，仍自动列出已发现且获准使用的 skill；其他 provider 的 `disable-model-invocation` 不作为 OpenCode 的调用开关。
- 版本未知时，带此字段的 skill 显示 `pending` 并说明需要确认 v2，不误报自动或仅手动。
- 环境变量关闭目录扫描与 skill 权限 deny 优先于仅手动；兼容 v1 `permission.skill` 和 v2 `permissions[]`（按路径 ID，末个匹配获胜）。
- 加载机制说明展示探测版本及来源，区分 v1 / v2 / 未知；刷新时重新探测，旧格式快照失效。

## 非目标

- 不修改宿主或用户的 skill 文件，不增加其他 v2 配置来源、远程目录或权限管理功能。
- 不改变其他 provider 的扫描行为，不提交或发版。

## 验收

- 宿主版本有效时不运行 fallback；宿主失败、不可解析或超时可回退，CLI 不可用时扫描仍可完成。
- v1 / v2 / 未知、布尔 / 字符串 false、默认自动、外部目录、deny / ask、foreign frontmatter 均有回归覆盖。
- 本机设置该字段的 skill 在 v2 扫描结果中进入仅手动；typecheck、测试通过，重载后插件 running。
