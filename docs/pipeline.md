# NotebookLM Pipeline

## 目标

把“看到一个有价值的 URL”变成一条可复用学习流程：

```text
YouTube URL
  -> agent 创建本地 session
  -> agent 通过 nlm CLI 创建 NotebookLM notebook
  -> NotebookLM 消化 source
  -> agent 拉回结构化输出
  -> 本地 notes + synthesis
  -> topic 建议与索引
  -> 用户确认 topic
```

## 默认入口

用户只需说：

```text
用 NotebookLM Pipeline 处理这个视频：
<URL>
```

agent 不应强制用户先给完整 topic、目标、输出格式。MVP 阶段只支持 YouTube URL。默认目标是：

- 消化内容。
- 提取核心结构。
- 形成小型知识拓扑。
- 生成个人追问。
- 写本地沉淀与知识卡片。
- 不生成公开草稿，不自动发布。

## 阶段 0：识别与准备

agent 先读取：

- `README.md`
- `docs/agent-runbook.md`
- `docs/vault-schema.md`
- `docs/publishing-policy.md`

然后确认：

- URL 是否为 YouTube。
- 是否已有相似 topic。
- 是否需要新建 session。
- 是否有明显版权、隐私或内部项目风险。

只在必要时问一个短问题。若 URL 本身足够，直接执行默认流程。

## 阶段 1：创建本地 session

先本地建 session，再操作 NotebookLM。这样即使 NotebookLM 后续失败，也有可追踪记录。

```text
vault/sessions/YYYY/MM/<slug>/
  source.yaml
  raw/
  notebooklm/
  notes/
  synthesis.md
  publish/
```

`slug` 由 agent 基于标题或 URL 推断。若标题未知，可先用临时 slug，处理后再建议改名。

## 阶段 2：创建 NotebookLM notebook

MVP 阶段一条 source 一个 Notebook，默认新建 notebook。

后续可扩展为：

- 同一课程/系列复用一个 notebook。
- 同一领域长期 notebook。
- 多 source notebook 复盘。

NotebookLM notebook id 写入 `source.yaml`，不要只保存在 CLI context。

## 阶段 3：导入 source 与等待处理

通过 `nlm` CLI 添加 source。MCP 可辅助，但 MVP 验收以 CLI 路径为准。

示例：

```bash
nlm notebook create "2026-05 - <topic>"
nlm source add <notebook_id> --url "<URL>"
```

若 source 处理失败：

- 记录错误到 `notes/process-log.md`。
- 对 YouTube，检查是否无 captions、地区限制、私有视频或格式不支持。
- 可建议使用 transcript MCP 或手动导出 transcript。
- 不要把失败误写成已完成。

## 阶段 4：NotebookLM 消化

默认追问模板：

1. 这份材料的核心问题、结论和论证结构是什么？
2. 关键概念之间的关系如何？请给出知识拓扑。
3. 哪些观点可迁移到我的个人知识系统、AI vibecoding 或当前项目？
4. 有哪些反例、争议、薄弱假设？
5. 请给出适合后续复习的 quiz、flashcards 或 study guide。

输出优先保存到：

```text
notebooklm/report.md
notebooklm/topology.md
notebooklm/study-guide.md
notebooklm/quiz.json
notebooklm/flashcards.json
```

若 NotebookLM artifact 可下载，再下载原始 artifact；否则保存 agent 查询结果并标注来源。

## 阶段 5：本地二次消化

agent 基于本地文件写：

- `notes/questions.md`：后续可继续追问的问题。
- `notes/my-notes.md`：若用户已有表达，保留用户原话；若没有，先留空或写“待用户补充”。
- `synthesis.md`：知识卡片，区分 NotebookLM 输出与 agent 推断。

`synthesis.md` 是本地沉淀的核心，不是 NotebookLM 单次回答的复制，也不是普通观看笔记。它应能被未来 Codex/Gemini 直接复用。

## 阶段 6：topic 建议

agent 自动生成 topic 建议，不要求用户一开始分类。

写入 `source.yaml`：

```yaml
topics:
  proposed:
    - id: ai-agents
      confidence: 0.86
      reason: "内容围绕 agent memory、tool use、workflow orchestration"
    - id: personal-knowledge-system
      confidence: 0.72
      reason: "可迁移到本地 vault 与公开知识区"
  approved: []
```

只有用户确认后，才更新 `topics/<topic>/index.md` 的 approved 关联。MVP 每次处理结束都必须询问用户是否确认 proposed topics。

## 阶段 7：发布边界

默认不生成：

```text
publish/website.md
publish/metadata.json
```

若内容看起来适合公开，只标注：

```yaml
status:
  publish_candidate: true
  publish_reason: ""
```

只有用户明确要求发布，或后续调用发布 skill，才生成 `publish/website.md`。发布稿应遵守 `docs/publishing-policy.md`。

## 阶段 8：收尾记录

每次处理结束，更新：

- `source.yaml` 的状态。
- `notes/process-log.md`。
- `vault/notebooklm/notebooks.yaml`。
- topic proposed/approved 状态。
- topic 确认问题。

完成声明必须附带实际产物路径。
