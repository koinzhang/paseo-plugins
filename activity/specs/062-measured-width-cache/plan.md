# 062 — plan

## 1. `client/measured-width.ts`

```ts
const widths = new Map<string, number>();

export function useMeasuredWidth(key: string): [number, Ref<View>, (event: LayoutChangeEvent) => void] {
  const [width, setWidth] = useState(() => widths.get(key) ?? 0);
  const ref = useRef<MeasurableElement | null>(null);   // web: 宿主 DOM 节点

  const apply = useCallback((next: number) => {
    if (!(next > 0)) return;        // 隐藏容器 / 未布局报 0，保留上次真实宽度
    widths.set(key, next);
    setWidth(next);
  }, [key]);

  const measure = useCallback(() => {
    const rect = ref.current?.getBoundingClientRect?.();
    if (rect) apply(rect.width);    // 同步测量：不等 ResizeObserver
  }, [apply]);

  useLayoutEffect(() => {
    measure();
    win.addEventListener?.("resize", measure);
    win.document?.addEventListener?.("visibilitychange", measure);
    return () => { …remove… };
  }, [measure]);

  const onLayout = useCallback((event) => apply(event.nativeEvent.layout.width), [apply]);
  return [width, ref as unknown as Ref<View>, onLayout];
}
```

- `ref` 的 cast 只在这一处，注释说明 RNW 把 ref 交给宿主 DOM 节点，RN 的 `View` ref 类型描述的是原生组件
- 事件监听用 `addEventListener?.` 可选调用，非 web 宿主没有 `window.document` 也不会炸

## 2. `client/activity-heatmap.tsx`

```diff
-const [width, onWidthLayout] = useMeasuredWidth("global:heatmap");
+const [width, widthRef, onWidthLayout] = useMeasuredWidth("global:heatmap");
...
-<View style={{ gap: compact ? 10 : 12 }} onLayout={onWidthLayout}>
+<View ref={widthRef} style={{ gap: compact ? 10 : 12 }} onLayout={onWidthLayout}>
```

## 3. `client/hourly-activity-timeline.tsx`

```diff
-const [width, onWidthLayout] = useMeasuredWidth("global:timeline");
+const [width, widthRef, onWidthLayout] = useMeasuredWidth("global:timeline");
...
-<View style={{ gap: compact ? 10 : 12 }} onLayout={onWidthLayout}>
+<View ref={widthRef} style={{ gap: compact ? 10 : 12 }} onLayout={onWidthLayout}>
```

## 4. 诊断工具（已移除）

- `shared/usage.ts` 的 `usage.debug-log` RPC + `index.server.ts` 的 `console.log` handler
- `client/debug-trace.ts`（客户端 → 服务端日志）
- 热力图 / surface 内的探针（实例计数、`hm:beat` 心跳、自挂 `ResizeObserver`、`dataSet` 标记）

## 5. 风险

| 风险 | 缓解 |
|---|---|
| 容器真的缩到 0（可见但 0 宽）时网格按旧尺寸溢出 | 实际 0 宽只出现在宿主隐藏页面（`display: none`），不参与绘制 |
| `getBoundingClientRect` 在非 web 宿主不存在 | 可选链 + 回落到 `onLayout`；`ref` 类型断言只影响 web 路径 |
| `visibilitychange` 监听泄漏 | `useLayoutEffect` cleanup 里 `removeEventListener`，回调 identity 由 `useCallback` 固定 |
| 模块级 Map 泄漏 | key 是固定常量，最多两条 |
