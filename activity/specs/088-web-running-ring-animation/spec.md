# 088 — Web 端 running 圆环恢复旋转

## 问题

084 将 `RunningIndicator` 改为 `useNativeDriver: true` 后，Paseo 0.17.4 Web 运行时的 `Animated.loop` 只到达一次终点：角度始终为 `360deg`，视觉上与 `0deg` 相同，运行中 agent 的右下角圆环不再转动。087 的 SDK 适配未修改客户端或该动画，不是本次停转的直接原因。

## 目标

- Web 的 running agent 圆环以既有 800ms / 圈持续线性旋转。
- iOS / Android 保留原生驱动，不回退 084 的原生端优化。
- 保持 10px 圆环、颜色、位置与 `status === "running"` 的显示条件不变。

## 非目标

- 不改其他 transform / opacity 动画；它们是否受同类问题影响另行验证。
- 不改 SDK 版本、agent 状态采集或运行中环的视觉样式。

## 验收

- `RunningIndicator` 在 `Platform.OS === "web"` 时使用 JS 驱动，其他平台使用原生驱动。
- 平台选择有回归测试；`npm run typecheck` 与 `npm test` 通过。
- `paseo plugin reload activity` 后插件为 running；在当前 Paseo 0.17.4 Web 运行时实际采样，旋转角度随时间变化。
