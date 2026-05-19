# Synthesis Card Template

---
origin: agent-synthesis
card_type: reusable-knowledge
confidence: ""
source_url: ""
notebook_id: ""
topics:
  proposed:
    - "<topic-id>"
  # 默认填入 proposed 的 topic id；用户提出异议后再修订。
  approved:
    - "<topic-id>"
publish_candidate: false
---

## GPT 增量判断

只写 NotebookLM 输出之外的二阶判断、连接、取舍或反直觉结论。不要复述 `notebooklm/report.md` 和 `notebooklm/topology.md` 已覆盖的来源事实、核心结论和归纳。

## 可迁移用法

- 可迁移到的项目、工作流或判断模型：
- 最小可执行动作：
- 不适合迁移的场景：

## 边界与反例

- 该判断不成立的条件：
- 容易误用的地方：
- 仍需补证的问题：

## 下一步问题

- 继续追问 NotebookLM：
- 继续追问 GPT/agent：
- 需要新 source 验证：

## Topic 归档

### 建议归类

-

### 已确认

- 默认同 Proposed；如用户提出异议，改写 approved 与 topic 索引。
