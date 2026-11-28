# Tasks

- [x] 独立验证根因与真实基线：SQLite 只读查询、分类/聚合源码、上游 mapper。
- [x] 分类器识别直接读取、多路径、变量循环；shared/classify.test.ts 覆盖读取、搜索、控制流、损坏引号。
- [x] 存储多 Skill 与历史迁移；server/store.test.ts 覆盖 SQLite/JSONL、旧 schema、幂等及时间保留；真实固定快照元数据 0 项变化。
- [x] 同源聚合与 query scope；shared/usage.test.ts、server/handlers-query.test.ts 验证 summary、provider、agent、project、day/hour、recent 与 pill label。
- [x] Pi nested codemode 与外层 low 保守规则；server/ingest.test.ts 覆盖 canonical output.details.calls 和显式嵌套去重；真实 Pi item 回放产生原 /1 inferred read。
- [x] 真实库前后对比、typecheck、全量测试、reload/running 与 RPC 验收；291 项通过，示例 0 → 12 次可靠使用，见 research。
- [x] README 与 research 记录结果、限制、未验证项；桌面/移动端点击验收与归档 codemode 全量重扫未执行。
