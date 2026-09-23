# 004 · 隐藏 composer 语音按钮

## 目标

- Web / Electron 下，选中 Mono Light 或 Mono Dark 时，隐藏 composer 右下角的两个语音按钮：
  - 听写（Lucide `Mic`，`composer/input/input.tsx` 的 `VoiceButtonTooltip`）
  - 语音模式（Lucide `AudioLines`，`composer/index.tsx` 的 `ComposerVoiceModeButton`）
- 只影响 `data-testid="message-input-root"` 内的按钮

## 定位

- 官方插件 API 不能修改 composer；宿主也没有关闭语音的设置（`showVoice` 只区分 chat / terminal）
- 两个按钮都没有 `testID`，`accessibilityLabel` 随语言变化，因此用 CSS `:has()` 匹配图标 SVG path（lucide-react-native 0.546）：
  - 听写：`M19 10v2a7 7 0 0 1-14 0v-2`
  - 语音模式：同时包含 `M10 3v18` 与 `M22 10v3`
- 主题标记 `html[data-mono-theme]` 由 `client/web.ts` 在选中 Mono 主题时设置，与侧栏横排解耦

## 行为

- 听写进行中按钮图标变为停止 / 静音图标，不再匹配，因此停止按钮仍可见
- 快捷键仍可启动听写 / 语音模式（只隐藏按钮）
- 切换非 Mono 主题或停用插件后恢复

## 非目标

- iOS / Android 不生效
- 不禁用语音功能本身

## 风险

- 宿主更换图标或 lucide 升级改动 path 时失效（失效表现为按钮重新出现，不会误伤其他按钮）

## 验收

- `npm run typecheck`、`npm test` 通过
- `paseo plugin reload mono` 后状态为 `running`
- Mono 主题下 composer 不再显示两个语音按钮；附件、发送等按钮正常
- 切换非 Mono 主题后语音按钮恢复
