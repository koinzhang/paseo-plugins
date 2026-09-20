# 052 — Tasks

## T1 纯函数

- [x] T1.1 `fitFontSize` + `TextMeasurement`（client/fit-text.ts）
  - 验收：放得下保持 base；按溢出线性缩放；与当前字号无关；变宽回弹 base；`min` / `base` 夹紧；非法测量回退 base
  - 验证：`client/fit-text.test.ts`（6 例），已加入 `package.json` 测试清单
- [x] T1.2 删除首版「按当前字号迭代」的实现与对应断言（会与再测量互相拉锯）

## T2 组件

- [x] T2.1 `UsageStats` 拆 `StatTile` + `FitText`，接入测量与 `numberOfLines={1}`
  - 验收：数值 / 标签单行；固定行高（22 / 16）；布局参数与改动前一致
  - 验证：typecheck；浏览器 harness 实测（T3）
- [x] T2.2 隐藏测量副本（`0×0` 绝对定位 + `overflow: hidden` + 1000px row + `flexShrink: 0`）
  - 验收：能测到固有宽度（受约束副本只回报夹紧宽度）；不产生横向溢出
  - 验证：harness 探针 —— 80px 容器内 `numberOfLines` 文本回报 78（夹紧），隐藏副本回报 106（固有）；`bodyScrollWidth == innerWidth`

## T3 验证

- [x] T3.1 浏览器 harness（react-native-web 离线渲染真实组件）
  - 命令：
    ```bash
    mkdir -p /tmp/rnw-harness && cd /tmp/rnw-harness && npm init -y && npm i react@19 react-dom@19 react-native-web@0.21 esbuild
    # entry.tsx：import { UsageStats } from "<repo>/activity/client/usage-stats.tsx" 等
    ./node_modules/.bin/esbuild entry.tsx --bundle --outfile=out.js \
      --alias:react=/tmp/rnw-harness/node_modules/react \
      --alias:react-dom=/tmp/rnw-harness/node_modules/react-dom \
      --alias:react-native=react-native-web \
      --alias:react-native-web=/tmp/rnw-harness/node_modules/react-native-web \
      --format=iife --jsx=automatic --define:process.env.NODE_ENV='"development"'
    # 静态服务（file:// 会吞掉脚本错误，必须走 http）：bun run serve.ts → http://127.0.0.1:8791
    ```
  - 验收：三层 KPI 在 784 / 340 / 300px 宽度下全部单行、无截断、标签同基线
  - 验证：`Cursor · 61%` → 17.3px、`Auto Smart · 64%` → 12.4px（784px）；dense 全 18px；窄面板 15–15.5px
- [x] T3.2 `npm run typecheck` + `npm test`（198 通过）
- [x] T3.3 `paseo plugin reload activity-dev` → running，无错误日志

## 备注

- 首版实现（`fitFontSize(current, measured, available, …)`）在真实渲染里暴露两个问题：测量副本随字号变化会与再测量互相拉锯（18 → 12.8 → 18 抖动），且格子宽度变化时不会再触发测量。改为「单次测量 + 绝对目标字号」后两者同时消失。
- harness 位于 `/tmp/rnw-harness`（仓库外，不随插件发布）；同一套 harness 也可用于 051 直方图与浮层的像素验证。
