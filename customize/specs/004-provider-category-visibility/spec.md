# Provider 配置分类可见性

切换 Provider 时，Customize 只显示该 Provider 已确认支持的配置分类。分类可见性由产品能力决定，不由磁盘扫描是否完整决定。

## 验收

- 不支持或尚未核实的分类不出现在分类栏；没有独立 Rules 文件的 Provider 不显示 Rules。
- 已确认支持但没有可靠扫描位置的分类保留，并提示扫描范围的限制。
- 当前分类在新 Provider 中不可见时，选中该 Provider 的第一个可见分类。跨 Provider / Project 保持同一分类的规则见 `012-sticky-category`。
- 可见分类没有配置时仍能显示空状态；扫描器不因分类隐藏而改变行为。
