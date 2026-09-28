# 016 · Research

- 上游只读 checkout：`/Users/koinzhang/Workspace/xws/paseo`，commit `49f9cec6be01ef7e7604dadf127425eac6493820`；本机 `paseo --version` 为 `0.9.2`，daemon 为 `0.10.0-beta.1`。
- `packages/app/src/composer/input/input.tsx`：附件 tray 位于 `message-input-root` 内；编辑输入标记为 `data-composer-input`，只读文字使用 `composer-readonly-content`。输入使用 `theme.fontSize.content`。
- `packages/app/src/components/attachment-pill.tsx`：附件标题使用 `theme.fontSize.base`，原图标栏宽度 18px。
- Mono 原实现不覆盖标题字号，路径固定 14px，类型标记固定 18px。因此改为读取输入实际字号，而非固定宿主 token 数值。
