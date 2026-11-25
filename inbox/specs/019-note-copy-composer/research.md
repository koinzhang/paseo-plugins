# 019 Research

## 版本锚点

- 日期：2026-11-25。
- 上游：`/Users/koinzhang/Workspace/xws/paseo`，HEAD `1ff119dc2a42825e7fdc46c504b6ccee52a4f8be`，Paseo / SDK 0.17.4。
- Inbox 实际安装的 plugin / client / protocol 均为 0.17.4；manifest 最低 Paseo `>=0.17.4`。

## 契约

- `packages/plugin/src/client/composer.tsx` 导出 `useComposers(selector)`；`PluginComposer.insertText(text)` 是同步 void，`focus()` 返回 Promise。
- `public-docs/plugins/reference.md` 的 focused selector 表说明：它是 workspace on screen 的 focused agent tab，plugin screen 上为空。因此全局页面没有目标时禁用是正确行为，不用旧 agent 猜目标。
- `packages/app/src/plugins/composer-items/source.ts` 的 `namedAgentId` 要求 focused agent 与插件 serverId 相同且未归档。workspace 面板上的当前 agent 经同一 focused selector 解析。
- `packages/app/src/composer/agent-composer/index.ts:290`：mounted live input 使用 `insertText`；离屏时 `current + text` 保存草稿，不发送。
- `packages/app/src/composer/agent-composer/index.ts:297`：`focus()` 在需要时 reveal agent，成功后聚焦输入框。
- `public-docs/plugins/reference.md:1310` 指定公开 `copyText(text)`；应在用户操作中 await，拒绝时不能显示成功。

## 交互边界

- 本次采用正文 `body`，因为用户说“笔记”而非标题；标题可通过现有列表 / 详情查看，不把元数据混入 prompt。
- SDK 没有 insert-and-send API，本次也不调用 `paseo.agents.ref(id).send`，避免“发送到输入框”被误解为立即执行。
- 插入再聚焦后如聚焦失败，正文仍可能已进入草稿；toast 如实报告聚焦失败，不回滚用户输入。
