# paseo-plugins

[English](./README.md) | 简体中文

Paseo 插件 monorepo。所有插件独立目录、独立 `paseo-plugin.json`，共用本仓库的 spec 驱动开发流程。

## 插件

| 插件 | ID | 说明 |
|---|---|---|
| [Activity](./activity/) | `activity` | 本地统计工具调用（skill / MCP / shell / 文件读写）、agent 创建、用户发送消息与 model 使用 |

## Activity

自动采集所有 agent 的 Paseo timeline 并落本地 SQLite，回答「我 / 各 provider 到底怎么在用」：

| 维度 | 计量 |
|---|---|
| Tools | skill / MCP / shell / file 调用次数；skill 分 exact / inferred / low 三档置信度 |
| Agents | 凡创建即计入的 agent 注册表（含归档元数据） |
| Messages | 用户发送的对话次数 |
| Models | 发送时 model（按消息加权） |

UI 入口：

- **Composer pill** — 当前 agent 的 skill / MCP 概况，无数据时隐藏
- **Agent workspace panel** — 本 agent 详情（KPI / Skills / MCP / SKILL.md 阅读器）
- **侧边栏 Activity** — 全局视图，按 provider 分区；热力图、KPI、Insights、Most used
- **Command Center** — 打开面板、导出 markdown 使用报告

数据目录 `~/.paseo/plugin-data/activity/`（SQLite `usage.db`）。Paseo timeline / `agents.list` 仅作采集与回填源，查询路径只读本地库。

## 安装

需要 Paseo >= 0.8.0。

```bash
cd activity
paseo plugin install .
paseo plugin reload activity   # 源码改动后重载
paseo plugin logs activity     # 查看子进程日志
paseo plugin ls                # 确认 running
```

## 开发

```bash
cd activity
npm install
npm run typecheck
npm test
```

本仓库采用 spec 驱动开发：编码前先读 [activity/specs/README.md](./activity/specs/README.md) 总览，再读对应编号目录；新功能建新编号目录（`specs/00N-...`），实现与 spec 出现偏差时先更新 spec。

## 目录结构

```
activity/
  index.client.tsx        # 客户端入口：surface / sidebar / panel / pill / Command Center
  index.server.ts         # 服务端入口：RPC handlers、事件订阅、后台补扫
  client/                 # pill、panel、全局 surface、查询与展示
  server/                 # 采集、SQLite 存储、分类、后台同步
  shared/                 # RPC 契约（zod）、分类与格式化
  specs/                  # 001–015 编号 spec / plan / tasks / contracts
```
