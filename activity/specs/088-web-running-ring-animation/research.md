# Research

## 版本锚点

- 上游 Paseo commit：`1ff119dc2a42825e7fdc46c504b6ccee52a4f8be`
- 本机 `paseo --version`：`0.17.4`
- 实际应用：`/Applications/Paseo.app` 的 `CFBundleShortVersionString` 为 `0.17.4`。

## 已验证

- `d1e2d57`（2026-09-19）新增 `RunningIndicator`，原始实现为 `useNativeDriver: false`；036 要求持续旋转，但其真机目视验收当时未完成。
- `1a8d922`（2026-10-01，084）仅将该圆环改为原生驱动；`a8bfad3`（2026-11-25，087）未改 Activity 客户端。
- 真机 Workspace Agents 的 `running` 状态正常，圆环静止属于动画路径问题。
- 在隔离浏览器直接执行当前 Paseo 0.17.4 app-dist 中的 Metro 模块 `278`（`Animated`）：原生驱动循环连续采样均为 `360deg`，`animation._isUsingNativeDriver()` 为 `true`；JS 驱动采样出现 `0deg`、`146.29422474630064deg`、`2.0000942714572485deg` 等变化值。
- 宿主自己的 `packages/app/src/components/status-ring/clock.web.ts` 使用浏览器 `Element.animate`，native 版本使用 Reanimated；本次仅在 Activity 的 RN Animated 组件中恢复 Web JS 驱动，不引入浏览器专用 DOM API。
