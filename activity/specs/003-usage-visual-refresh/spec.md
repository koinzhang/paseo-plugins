# 003 — Usage 视觉统一

参考用户提供的 ChatGPT activity 截图，覆盖全局 **Activity** 页、composer pill、popover 与 agent 详情 tab。以本规范补充 001/002 的 UI 描述；统计和导航契约不变。产品名见 [007](../007-rename-activity/)。

- 全局：居中宽版内容、圆角细边框统计横条、居中数字、低对比文字筛选、宽屏三列 insights / skills / MCP，缩短 label/value 间距，compact 堆叠。Most used skills 图标用 accent；Most used MCP 图标按 server 名从 accent 色相派生的稳定颜色区分（同一 server 恒定，饱和度/亮度按主题夹取），不改动统计与筛选契约。
- 热力图：七行日历，宽屏填满容器，最小格子 12px、短区间最大 24px；窄屏横向滚动；月份与格子对齐且不重叠；未来日期留空。
- Daily / Weekly / Cumulative 保留；累计值延续到无活动日；以本地日历推进，避免 DST 丢周。
- 色阶采用主题 accent 与 surface2 混色，零值独立；不显示底部说明与 Less / More 图例；hover、键盘 focus 或点选在格子附近显示主题 surface2 背景 / foreground 文字的小型圆角提示 `x skills, x mcp on date`，不显示白色格子边框；周/累计标明口径。
- pill 保留最近实体名 + N、空数据隐藏，图标统一 Activity；宿主控制外框。
- 导航图标与 pill 统一：侧边栏项、workspace panel、Command Center 打开项用 `Activity`（export 保留 `FileDown`）；此前为 `ChartColumn`。
- popover / panel：统一标题层级、轻量文字 tabs、类型图标、次数右对齐；保留 skill 阅读与打开 tab 行为，打开按钮带可见文字。
- 保持 loading / error / empty 状态；React Native 原语与主题颜色，支持 compact。

验收：typecheck、现有测试、热力图模型的空日期累计/DST/未来日期测试；能连接宿主时检查 reload 和宽/窄视觉效果。

- 月份与提示日期使用 App 页面 lang，不使用系统默认 locale；页面 lang 变化即时更新。当前 SDK 无原生语言接口，非 web 或页面未声明语言时使用 App 默认英文。
