# Plan

- `client/workspace/running-indicator-motion.ts`：纯函数 `shouldUseNativeDriver(platform)`，Web 返回 `false`，其他平台返回 `true`；`running-indicator.tsx` 按 `Platform.OS` 选择。
- `client/workspace/running-indicator.test.ts`：直接覆盖 Web / iOS / Android 的平台选择，防止统一改回原生驱动。
- `docs/design-system.md`：注明 running 圆环的 Web 例外，084 的其他动画规则不变。
- 验证沿用宿主实际 Web 动画模块：对 `useNativeDriver: false` 的循环采样应得到变化角度，不依赖静态源码推断。
