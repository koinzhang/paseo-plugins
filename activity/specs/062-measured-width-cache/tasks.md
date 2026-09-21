# 062 — tasks

- [x] T1 诊断：临时 trace 打通客户端 → 插件日志
  - 验证：`paseo plugin logs activity-dev` 出现 `hm:beat` / `hm:ro` / `hm:vis` / `sf:beat`
- [x] T2 定位成因
  - 验证：可见实例 `dom: 740` 而 `width: 0`、`cell: 0`；`visibilityState: hidden`；自挂 ResizeObserver（root/body）回调 0 次
- [x] T3 `client/measured-width.ts` 改为 `[width, ref, onLayout]`
  - 验证：0 宽不写入 state / 缓存；`useLayoutEffect` 同步 `getBoundingClientRect`；监听 `resize` / `visibilitychange`
- [x] T4 热力图 / Timeline 挂 `ref`
  - 验证：两个根节点 `ref={widthRef} onLayout={onWidthLayout}`
- [x] T5 验证修复
  - 验证：trace 显示 `width: 740`、`cell: 11`，此时 `visibilityState: hidden` 且 `roRoot/roBody` 仍为 0
- [x] T6 移除诊断工具
  - 验证：`usage.debug-log` / `debug-trace.ts` / 探针全部删除，仓库内无 `TEMP` 残留；`npm run typecheck`、`npm test` 212 pass
- [x] T7 Spec / plan / tasks / README / CHANGELOG
  - 验证：本目录三件套按实测结论重写；`specs/README.md` 062 行；Unreleased → Fixed 条目
- [ ] T8 页面目测
  - 验证：切回 Activity 首帧即完整（热力图不塌陷重排）；窗口从后台切回时同样不重排
