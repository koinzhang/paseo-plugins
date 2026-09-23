# 006 · 模型可见性开关

## 目标

- Settings → Providers → 某个 provider 打开的模型列表弹窗中，每行模型末尾增加一个开关（开 = 在模型选择中显示）
- 关闭的模型在 composer 模型选择（以及复用同一组件的新建 agent / agent controls 模型列表）中隐藏
- 设置持久化，同一 host 的客户端共享

## 定位

- 官方插件 API 不能扩展 Provider 弹窗或过滤模型列表，宿主也没有隐藏模型的配置（`favoriteModels` 已于 v0.3.2 废弃）
- 与 004 一样走 Web DOM 适配器，但独立成 `client/model-visibility-web.ts`（自己的 observer 与 `<style>`），不依赖 Mono 主题：这是用户显式配置，与主题无关
- 独立设置文档而非并入 `display`：值是列表，且由 DOM 适配器直接读写，不经设置页

## 设计

### 数据

- `shared/settings.ts` 新增设置文档 `models`（`scope: "host"`, `version: 1`）：`{ hidden: Array<{ provider, modelId }> }`，默认空
- `index.server.ts` 注册；读写走 `settingsRpc("models")`，写入带 `revision`，冲突时重读后重放一次，失败则回到服务端状态
- `client/model-visibility-store.ts`：启动读取一次；切换开关时乐观更新并串行写入

### Provider 弹窗（注入开关）

- 定位：`[data-testid="provider-settings-sheet"] [role="dialog"]`（桌面 Web 的 `AdaptiveModalSheet`，portal 到 overlay root）
- provider id：弹窗标题是 provider label（缺省为 id），与 `client.paseo.providers.snapshot()` 的 `label ?? provider` 比对；label 重名时不注入。每次弹窗出现时刷新 snapshot
- 模型行：`provider-diagnostic-sheet.tsx` 中 model id 文本带 `data-pmono`（`CODE_SURFACE_DATASET`），其父元素即行
- 开关：原生 `<button role="switch" aria-checked>`，`data-mono-model-toggle`，始终追加到行末（自定义模型在删除按钮之后），保证各行开关纵向对齐
  - 插件运行时不提供 `react-dom`（`plugins/evaluate.ts` 只放行 react / react-native / SDK），无法在宿主 DOM 中挂载官方 `Switch`；因此按 `switchGeometry` 复刻：轨道 34×20、滑块 16、阴影 `0 1px 2px rgba(0,0,0,.25)`、180ms ease-in-out
  - 颜色：优先采样页面上宿主 `Switch`（弹窗背后 Providers 页的启用开关）的轨道 / 滑块背景色，分别对应开 / 关；轨道 / 滑块按尺寸（34×20 / 16×16）识别而非 DOM 层级（宿主有额外包裹层），透明色不采用；缺失时回退到文字色、弹窗背景色、`color-mix` 与白色

### 模型选择中的 provider 数量

- 模型选择的 provider 行 `testID="model-provider-${id}"`，尾部文字为 `selection.rows.length` 的 i18n 文案（如 `16 models`）
- 改写其中第一个数字为「总数 − 该 provider 下被隐藏且仍在 snapshot 模型列表中的数量」；英文单复数随之调整
- 用 `data-mono-count-original` / `data-mono-count-shown` 记录原文与改写值；宿主更新文字时以新文字为原文，停用时还原
- 适配器停用时移除全部开关

### Composer 隐藏

- `model-browser.tsx` 每行 `testID="model-row-${provider}-${modelId}"`；按 `hidden` 生成 CSS，隐藏该元素及其直接父元素（hover 边界），独立 `<style>`
- `FlatList` 未设 `getItemLayout`，隐藏后不留空位

## 非目标

- iOS / Android 以及窄屏 Web（弹窗为 bottom sheet，模型行不在 testID 容器内）不生效
- 不禁用模型：已选中的模型仍显示在触发按钮上；Profile 行（`model-profile-row-*`）不隐藏；Settings → Providers 列表的模型计数不变
- 不做跨客户端实时同步：其他客户端修改后需重载插件

## 风险

- 依赖宿主 DOM：`provider-settings-sheet`、`data-pmono`、`role="dialog"`、`model-row-*`。失效表现为开关不出现或不隐藏，不会误伤其他元素

## 验收

- `npm run typecheck`、`npm test` 通过
- `paseo plugin reload mono` 后状态为 `running`
- Provider 弹窗每行出现开关，默认开启；关闭后 composer 模型列表中该模型消失，重新开启后恢复
- 重载插件后设置保持；停用插件后开关消失、模型全部恢复
