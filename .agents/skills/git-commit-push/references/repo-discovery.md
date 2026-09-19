# 仓库定位

后续所有 `git` 命令均在定位到的**仓库根目录**执行。

## 快速路径

1. 在当前 working directory 执行 `git rev-parse --show-toplevel`。成功则以此作为仓库根，**跳过下方扫描**。
2. 聚合 workspace（如 tenpaygo-workspace）：若本轮编辑的文件均落在同一子仓，直接进入该子仓，**无需** AskQuestion。
3. 多仓且上下文不明确时，见下方「多仓选择」。

## 扫描配置

当前目录不是 Git 仓库时，先对齐工作区 **VS Code Git 扫描配置**，再回退通用查找。

### 解析 `.vscode/settings.json`

- 自当前目录**向上**查找第一个包含 `.vscode/settings.json` 的目录，作为 `WORKSPACE_ROOT`（找不到则走回退）。
- 读取配置（JSONC 带注释时需能解析注释；失败视为无配置）。
- 字段（与 VS Code 一致，**优先用配置实际值，勿硬编码默认**）：
  - `git.repositoryScanMaxDepth` → 扫描深度 `D`（缺省 `3`；tenpaygo-workspace 经 `sync-workspace` 生成时通常为 `1`）
  - `git.scanRepositories` → 显式扫描路径列表 `R`（缺省 `[]`）
  - `git.autoRepositoryDetection` → 自动发现（缺省 `true`；为 `false` 时仅扫描 `R`）

### 收集 `.git` 候选

- `R` 非空：对每个 `WORKSPACE_ROOT/$rel` 执行：
  ```bash
  find "$BASE" -maxdepth "$D" -name .git \( -type d -o -type f \)
  ```
  （可对 `node_modules`、`bazel-*` 等加 `-prune`。）
- `R` 为空且 `autoRepositoryDetection !== false`：
  ```bash
  find "$WORKSPACE_ROOT" -maxdepth "$D" -name .git \( -type d -o -type f \)
  ```
- 回退（2b 未命中时）：自当前目录向下，深度用已解析的 `D`（未解析则用 `3`）：
  ```bash
  find . -maxdepth "$D" -name .git \( -type d -o -type f \)
  ```

## 处理候选结果

| 数量 | 行为 |
|------|------|
| 0 | 告知未发现仓库并结束 |
| 1 | `cd` 到 `.git` 父目录作为仓库根 |
| 多个 | 见「多仓选择」 |

### 多仓选择

1. 对每个候选并行执行 `git -C <repo> status --short`，汇总 dirty 状态。
2. **AskQuestion** 单选目标仓库（每个候选一条 option）：
   - `id`：相对 `WORKSPACE_ROOT` 的路径（如 `20-client-app-pai-android`）
   - `label`：相对路径 + `(N 个未提交变更)` 或 `(clean)`
   - 仅一个仓库有变更时标 **Recommended**
3. 候选超过 **15** 个：只列有变更的仓库；仍超过则按路径排序取前 15，其余通过 **Other** 粘贴绝对路径。
4. 选定后 `cd` 到该仓库根。

**注意**：tenpaygo-workspace 根仓仅含同步脚本与 Agent 配置；业务改动应落在**最深层有变更的业务子仓**，勿误用根仓。
