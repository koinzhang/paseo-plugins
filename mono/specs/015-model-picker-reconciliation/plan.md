# 015 · Plan

1. 006 的数量改写改为插件属性 + CSS 伪元素覆盖。宿主 `textContent` 保持原样，MutationObserver 不观察这些插件属性；不同实例不再通过宿主文字节点变更互相触发。
2. 数量原始字体和 accessibility label 记录在插件属性中，多个实例共用首次记录的宿主原值。每个实例只清理仍属于自己的覆盖，避免停用一个实例时撤销另一个实例的值。
3. 两套 Web 适配器以 `requestAnimationFrame` 合并观察器通知；不在微任务检查点里执行扫描，cleanup 取消待执行帧。模型 CSS 只在文本改变时写入。
4. 浏览器回归使用 TypeScript 转译后的实际适配器、原生 MutationObserver 与可控帧调度，测试多个独立实例及卸载；给微任务设限以便旧实现失败时仍能返回诊断结果。帧由测试显式推进，避免后台页暂停原生 requestAnimationFrame 导致超时。
