# 020 Tasks

- [ ] 收敛 shared / store / slash / settings，移除 scratch 写入和筛选，并验证旧库与旧设置迁移。
- [ ] 列表补齐 Pin / Copy / Send / Delete，保持平台显隐、红色删除、busy / toast / 刷新与选择语义。
- [ ] agent 列表补齐 active Open / Pin / Remove from Inbox，保持 hover / mobile 显隐，不归档或删除宿主 agent。
- [ ] 移除 Scratch chip、Convert、重复详情分支及文档描述，补完整验证与 reload。
- [ ] 将筛选 chips 改为搜索栏右侧 Filter 菜单：All / Agents / Notes 单选、当前 Check、外部关闭、原设置持久化。
- [x] 修复用户截图中的菜单层级：后渲染的菜单与 backdrop 覆盖列表，无文字穿透、toolbar 不裁切。已通过 typecheck；用户要求不做界面测试，待其实际确认视觉结果。
- [x] 筛选改为 Agents / Notes 多选，默认全选，设置版本升级并保持连续选择。已验证新旧设置迁移、空选择与 SQL 过滤。
- [x] 详情按钮与列表同为透明分隔线样式；agent 消息移除边框，保留 Unarchive / Open 语义。已通过 typecheck，待用户查看实际界面。
- [x] 列表 agent 首个操作与详情一致：active Open、archived Unarchive，共享恢复与 pending / 刷新逻辑；missing 禁用 Open。typecheck / 80 项测试 / diff check 通过，reload 后 running；未实际反归档或做界面测试。
