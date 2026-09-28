# 020 — Provider 版本与顶部展示

## 目标

- Customize 支持的全部 provider 扫描结果包含本机版本信息：优先宿主诊断 `Version`，失败或不可解析时回退到本地 CLI。
- 统一解析标准 semver、带产品前缀的输出、括号产品名，以及 Cursor 日期构建号；不能把错误文本、路径或 launcher 的未知输出误报为版本。
- 顶部固定顺序为「兼容图标（如有）→ 版本 → Provider → Project → Rescan」。版本在任意分类都可见，切换 provider 后跟随该 provider 的扫描结果。
- 版本使用现有文字和颜色 tokens，统一带 `v` 前缀（包括 Cursor 日期构建号）；无版本、探测失败或解析报错时隐藏整个版本区域，不显示占位文案。窄屏可以换行但兼容图标、版本与 Provider 保持一组。
- OpenCode 加载机制中移除重复的已检测版本与来源，保留对应 v1/v2/未知版本的行为说明；不改变上一轮 v2 autoinvoke 判断。
- 版本随扫描快照保存和刷新；旧快照失效，避免其他 provider 长时间没有版本。

## 非目标

- 不安装、升级 provider，不修改宿主配置或 provider 选择偏好，不发版或提交。
- 不按新版本改变其他 provider 的技能解析规则。

## 验收

- 本机 Claude / Codex / OpenCode / Cursor / Pi / OMP 版本可通过真实 RPC 获取；未安装的 CLI 不影响配置扫描。
- 常见输出、宿主优先/CLI fallback/失败、provider ID 与 CLI 名不同、旧快照均有回归覆盖。
- typecheck 和测试通过；重载后 running；确认宽屏与紧凑布局顺序和主题文字颜色。
