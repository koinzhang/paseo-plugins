# 方案

1. 扩展 Provider ID 与配置分类；旧 Provider 的新分类先标记未验证。
2. 使用声明式扫描器处理各家已确认的文件、skills 目录、MCP 配置及插件清单；Cursor 复用现有扫描器扩展。
3. 配置机制与扫描路径保持一致；在 research.md 保留官方来源与版本锚点。
4. 用临时 HOME / project fixture 验证新 Provider，运行 typecheck、test，并重载本地插件。

扫描结果是磁盘配置清单，不代表 CLI 当前进程已加载；插件启用开关、信任状态、命令行覆盖仅在可读取时反映。
