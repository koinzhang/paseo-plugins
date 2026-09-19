# 实现方案

提取 shared/activity.ts 纯日历模型供测试。ActivityHeatmap 使用 onLayout 测宽和横向 ScrollView；格子不加选中/hover 边框；提示层放在横向 ScrollView 外，通过格子行列、滚动偏移和提示框实测尺寸定位，并限制在容器宽度内。宽屏三列等分，compact 纵向堆叠。全局与 agent 使用统一的圆角统计条；列表减少边框和等宽字体。Popover 的宿主锚定与 pill 生命周期不变。

不修改 RPC / 存储 / 采集。沿用既有 SKILL.md panel 导航。运行 typecheck、npm test；reload 已安装本地插件，不安装新来源或更改全局开关。

语言桥接放在 client/web.ts，仅 web 平台读取 documentElement.lang 并用 MutationObserver 订阅；native 回退 en。locale 显式传给日历模型及日期格式化。提示 12px / 16px 行高、10×6px 内边距、8px 圆角；移除底部整行。
