# Plan

## 最小改动

1. `shared/commands.ts` 的 `Profile` 增加可选 `options` 字段，与上游数据模型一致。
2. `PROFILE_KEYS` 加入 `options`，避免把已支持的字段当作启动专用字段。
3. `profileControl` 从 `profile.options ?? profile.featureValues ?? {}` 读取值，沿用已有可用 feature 筛选与 `config.featureValues` 输出。
4. 在现有 `shared/commands.test.ts` 增加新字段、双字段、空新字段与未知键回归测试。

## 边界

读取上游的配置结果，不自行转换 provider option 名称。Paseo daemon 已负责旧配置键的归一化。输出仍用起始安装的 SDK 0.15.1 支持的 RPC 数据形状；Paseo 0.17.4 的 protocol 明确保留 `AgentConfigApply.featureValues` 并将其映射为 options patch。

不触碰 `client/commands.ts`、runtime notice、005 spec、依赖与版本声明、README、CHANGELOG 或 spec 总索引等起始已有变更。

## 验证

- 修改前后运行 `node --experimental-strip-types --test shared/commands.test.ts`，确认新测试先失败、修复后通过。
- 修复后运行 `npm run typecheck`，记录实际结果和 SDK 状态；本次不安装依赖掩盖既有 `ctx.composers` 错误。若外部更新依赖，单独记录该变化。
- `git diff --check -- commands`，检查本次文件 diff 与全部未跟踪文件，区分本次修改与任务外已有改动。
- 完整测试、依赖安装与 reload 交由主 agent；不操作真实 agent 设置。
