# Plan

## 生命周期

```text
菜单完成测量并放置
  → 桌面 surface 设置 popover=auto 并 showPopover()
  → Paseo capture 快捷键发现 :popover-open，跳过 agent-interrupt
  → 浏览器 Escape 关闭 Popover / 菜单行关闭菜单 / 遮罩点击关闭菜单
  → toggle(newState=closed) 或 state.close()
  → 移除临时 pill、卸载 surface、hidePopover()
```

把 Popover 平台能力封装为小 helper，避免在共享 React Native 文件中扩散 DOM 类型。桌面关闭统一恢复菜单打开前的焦点；不支持 Popover 时以同一 helper 的前置监听兜底。单元测试用结构化 fake 验证打开、关闭回调、焦点恢复、卸载清理及能力缺失回退；真实 `:popover-open` 与全局快捷键关系由上游浏览器测试和本机 GUI 验证覆盖。

## 显示

桌面 surface 使用显式测量宽高，并清除原生 Popover 的默认 margin / padding 和右下 inset，保持原有上方左对齐、翻转与尺寸规则。其余平台不执行 Popover 初始化。
