# Tasks

- [x] T1 记录 spec / plan，明确先退出后入场、取消行为与范围。
- [x] T2 分离选择指标和显示指标，接线退出与入场动画；diff 检查确认只有退出完成后替换折线数据，取消回调不会提交指标。
- [x] T3 `npm run typecheck` 通过；`npm test` 254 项全部通过。
- [x] T4 `paseo plugin reload activity` 成功；`paseo plugin ls activity` 确认本 checkout 为 running。
- [ ] T5 页面目测：逐项切换及快速连续切换，确认旧折线下收、新折线上展，坐标轴固定。
  - 本轮未完成：Paseo 当前停留在 provider 设置，UI 工具检测到用户正在切换界面，停止操作以避免干扰。
