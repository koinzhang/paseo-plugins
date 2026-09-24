# 068 — Plan

宿主 Explorer 的内容容器使用 `theme.colors.surfaceSidebar`。Files 和 Changes 在该容器内渲染。插件收到的 `PluginTheme` 仅有 `surface0` / `surface1` / `surface2` 等颜色，没有 `surfaceSidebar`。

将 `client/workspace/panel.tsx` 的 `screen` 背景设为透明，让 Explorer 容器的背景透出。不硬编码主题色，也不修改宿主或其他 Activity 页面。
