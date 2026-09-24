# paseo-plugins

[![CI](https://github.com/koinzhang/paseo-plugins/actions/workflows/ci.yml/badge.svg)](https://github.com/koinzhang/paseo-plugins/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

[English](./README.md) | 简体中文

Paseo 插件 monorepo。所有插件独立目录、独立 `paseo-plugin.json`，共用本仓库的 spec 驱动开发流程。

## 插件

| 插件 | ID | 说明 |
|---|---|---|
| [Activity](./activity/) | `activity` | 本地用量分析 **兼** workspace agents 运营（Explorer 列表、实时 attention、终端） |
| [Mono](./mono/) | `mono` | Neutral 灰阶深色 / 浅色主题 |

## Activity

三层 Scope —— 不只是统计面板：

| Scope | 角色 |
|---|---|
| **Global**（侧边栏） | 跨 workspace 习惯：KPI 对比前 7 天、热力图 / 直方图 / Timeline 指标切换、Providers / Projects 排行、Insights、Most used skills / MCP / models |
| **Workspace**（Explorer Activity） | 当前 workspace 的 **竖向 Agents 运营页**：列表 / 搜索 / 排序 / 筛选 / 归档、实时 attention、打开中的 Terminals + KPI；agent 空闲时启发式刷新 |
| **Agent**（面板 + pill） | 当前会话的工具明细与 skill / MCP 概况；timeline 回合结束刷新 |

计量维度（本地 SQLite）：tools（skill / MCP / shell / file）、agent 创建、用户消息（UI 中称 Prompts）、model（按消息加权）。详见 [activity/README.md](./activity/README.md) · [架构](./activity/docs/architecture.md)。

数据目录 `~/.paseo/plugin-data/activity/`（`usage.db`）。timeline / `agents.list` 作采集与实时状态源；查询只读本地库。

## 安装

需要 Paseo >= 0.9.0-beta.2。Activity **0.4.0** 是最后支持 Paseo 0.8.0 的版本。

```bash
paseo plugin add koinzhang/paseo-plugins --path activity
paseo plugin ls                # 确认 running
```

npm（Paseo 0.9+）：`paseo plugin install npm:@koinzhang/paseo-plugin-activity`。Paseo 0.8 请钉住 `@0.4.0`。

本地 checkout（开发）改为安装目录：

```bash
cd activity
paseo plugin install "$PWD"   # 绝对路径；npm 版已安装时先 `paseo plugin remove activity`
paseo plugin reload activity   # 源码改动后重载
paseo plugin logs activity     # 查看子进程日志
```

## 开发

```bash
cd activity
npm install
npm run typecheck
npm test
```

本仓库采用 spec 驱动开发：编码前先读 [activity/specs/README.md](./activity/specs/README.md) 总览，再读对应编号目录；新功能建新编号目录（`specs/00N-...`），实现与 spec 出现偏差时先更新 spec。

完整贡献流程见 [CONTRIBUTING.md](./CONTRIBUTING.md)（含 [npm 发版](./CONTRIBUTING.md#publishing-to-npm)）；漏洞私下上报见 [SECURITY.md](./SECURITY.md)。

## 目录结构

```
activity/
  index.client.tsx        # 客户端：surface / sidebar / Explorer + agent panel / pill / Command Center
  index.server.ts         # 服务端：RPC、生命周期 hook、后台补扫
  client/                 # 全局 surface、agent panel、pill、workspace/（Explorer）
  server/                 # 采集、SQLite、分类、后台同步
  shared/                 # RPC 契约（zod）、聚合辅助
  docs/architecture.md    # Global / Workspace / Agent 分层
  specs/                  # 编号 spec / plan / tasks / contracts
```

## 许可证

[MIT](./LICENSE) © koinzhang
