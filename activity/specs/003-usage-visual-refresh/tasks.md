# Tasks

- [x] T1 热力图模型、响应式布局、详情与图例；新增 5 项模型测试覆盖累计空白日、周汇总、DST、未来格、空数据与 streak。
- [x] T2 全局统计条、筛选和两列列表；共享 UsageStats，typecheck 通过。
- [x] T3 pill / popover / panel 统一视觉及阅读器按钮；保留宿主导航与 pill 生命周期，typecheck 通过。
- [x] T4 自动验证与加载：npm run typecheck、npm test（66/66）、git diff --check；paseo plugin reload tool-usage 返回 running。
- [ ] 目视验收：宽屏/compact、深浅主题、popover → tab。阻塞：daemon HTTP 地址不提供网页；原生 Paseo UI 检查超时，尚无目视验证结论。

- [x] T5 宽屏三列与紧凑间距；格子旁反色提示及移除白色边框。验证：npm run typecheck、git diff --check 通过；提示层在滚动容器外，按格子坐标及滚动偏移定位，左右边缘限制在容器内。

- [x] T6 月份跟随 App 页面语言并监听 lang 更新；提示缩小为 12px 并采用主题背景/文字；移除说明及图例整行。验证：typecheck、67/67 测试（含显式中英文月份）、diff --check 通过；插件重载 running。原生 SDK 未提供语言接口，非 web 回退英文。

- [x] T7 Most used MCP 图标按 server 稳定上色（accent 色相派生，饱和度/亮度按主题夹取；非 hex 主题色回退 accent）；新增 client/rank-color 单测；Most used skills 名称去掉 `$` 前缀。验证：npm run typecheck、npm test（91/91）、git diff --check 通过。

- [x] T8 导航图标统一 `Activity`（sidebar / workspace panel / 两个 Command Center 打开项；export 保留 `FileDown`）。验证：typecheck 通过。
