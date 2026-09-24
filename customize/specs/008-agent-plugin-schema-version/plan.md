# 方案

1. 独立解析 canonical `plugin.schema.json` URL，提取语义版本；用版本选择本地已支持的校验器。未知版本只记录声明，不下载或推断 schema 内容。
2. 扫描条目携带规范版本与校验状态，代替无版本的 `agentPlugins` tag；UI 根据状态绘制动态文案。
3. 测试支持版本、未知版本、错误格式、无效清单和演示插件；运行类型检查、测试并重载 Customize。
