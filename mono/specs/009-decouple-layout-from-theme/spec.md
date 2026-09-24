# 009 · 布局调整与主题解耦

## 目标

- 主题（Mono Light / Mono Dark）与布局样式调整互不绑定：选任意主题都可以使用布局调整，选 Mono 主题也可以关闭布局调整
- 每项调整只由设置页开关控制：
  - Compact sidebar navigation（002）
  - Hide dividers and borders（新增，覆盖 007 分割线与 008 边框），默认开启
  - Hide Thinking in timeline（003，本来就与主题无关）
  - Hide dictation / voice mode button（004）

## 设计

- `client/web.ts` 不再在非 Mono 主题下撤销全部标记
- `html` 标记按职责拆分：
  - `data-mono-nav-active`：侧栏横排，`compactSidebarNav` 开启时设置
  - `data-mono-chrome`：分割线 / 边框，`minimalChrome` 开启时设置；对应的 DOM 扫描（pill 签名、header / 侧栏 computed style）只在开启时运行
  - `data-mono-theme="light|dark"`：仅在选中 Mono 主题时设置，只用于选取 Mono 调色板颜色
- 语音按钮 CSS 不再要求任何 `html` 标记，仅由两个开关生成
- Popover 边框：`minimalChrome` 开启时统一 0.5px；Mono 主题下颜色为调色板 `border` 50% 透明，其他主题保留宿主颜色（CSS 无法读取宿主当前颜色再调透明度）

## 非目标

- 拆分为两个插件
- iOS / Android 的 DOM 调整

## 验收

- `npm run typecheck`、`npm test` 通过
- `paseo plugin reload mono` 后状态为 `running`
- 切换到非 Mono 主题后，侧栏横排、分割线 / 边框、语音按钮隐藏仍按开关生效
- 关闭 Hide dividers and borders 后，分割线、composer / pill 边框恢复，popover 边框恢复宿主宽度与颜色
