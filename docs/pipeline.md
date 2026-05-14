# NotebookLM Pipeline

## 目标

把“看到一个有价值的 URL”变成一条可复用学习流程：

```text
YouTube URL
  -> agent 创建本地 session
  -> agent 通过 nlm CLI 创建 NotebookLM notebook
  -> NotebookLM 消化 source
  -> agent 生成并下载正式 NotebookLM Studio artifacts
  -> agent 拉回结构化输出
  -> 本地 notes + synthesis
  -> topic 建议与索引
  -> 默认 approved topics 并展示给用户
```

## 默认入口

用户只需说：

```text
用 NotebookLM Pipeline 处理这个视频：
<URL>
```

agent 不应强制用户先给完整 topic、目标、输出格式。MVP 阶段只支持 YouTube URL。默认目标是：

- 消化内容。
- 生成正式 NotebookLM Studio artifacts。
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
    artifacts/
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
nlm notebook create --profile learning "2026-05 - <topic>"
nlm source add --profile learning <notebook_id> --url "<URL>" --wait --wait-timeout 900
```

若 source 处理失败：

- 记录错误到 `notes/process-log.md`。
- 对 YouTube，检查是否无 captions、地区限制、私有视频或格式不支持。
- 可用 generic `--url` fallback；若 YouTube-specific 添加尝试返回 `Error: Could not add url source.`，先 `nlm source list --profile learning <notebook_id>` 检查是否留下远端 source stub。
- 若失败尝试留下额外 source，不删除；记录为 cleanup candidate，等待用户明确确认。
- 若存在多个 source，必须在 `source.yaml` 写 `primary_source_id`，后续 query 与 Studio artifact 生成都用 `--source-ids <primary_source_id>` 显式限定。
- 可建议使用 transcript MCP 或手动导出 transcript。
- 不要把失败误写成已完成。

## 阶段 4：正式 artifacts 生成与下载

添加 source 且等待 ready 后，agent 默认立刻生成正式 NotebookLM Studio artifacts，不需要用户主动唤起。

默认生成：

```bash
nlm report create --profile learning <notebook_id> --format "Study Guide" --source-ids <primary_source_id> --confirm
nlm quiz create --profile learning <notebook_id> --count 10 --difficulty 3 --source-ids <primary_source_id> --confirm
nlm flashcards create --profile learning <notebook_id> --difficulty hard --source-ids <primary_source_id> --confirm
nlm mindmap create --profile learning <notebook_id> --title "<short title>" --source-ids <primary_source_id> --confirm
```

随后查询状态：

```bash
nlm studio status --profile learning <notebook_id> --json
```

下载到本地 vault：

```bash
nlm download report <notebook_id> --id <artifact_id> --output "notebooklm/artifacts/report-study-guide.md"
nlm download quiz <notebook_id> --id <artifact_id> --format json --output "notebooklm/artifacts/quiz.json"
nlm download quiz <notebook_id> --id <artifact_id> --format markdown --output "notebooklm/artifacts/quiz.md"
nlm download quiz <notebook_id> --id <artifact_id> --format html --output "notebooklm/artifacts/quiz.html"
nlm download flashcards <notebook_id> --id <artifact_id> --format json --output "notebooklm/artifacts/flashcards.json"
nlm download flashcards <notebook_id> --id <artifact_id> --format markdown --output "notebooklm/artifacts/flashcards.md"
nlm download flashcards <notebook_id> --id <artifact_id> --format html --output "notebooklm/artifacts/flashcards.html"
nlm download mind-map <notebook_id> --id <artifact_id> --output "notebooklm/artifacts/mindmap.json"
```

`nlm download mind-map` 使用 hyphen；不要写成 `mindmap`。下载失败时记录到 `notes/process-log.md`，不要把失败误写成已完成。若个别 artifact 超时或失败，先保存已完成 artifacts，继续后续消化，并在 `source.yaml` 标注失败项。

## 阶段 5：NotebookLM 追问与消化

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
notebooklm/artifacts/
```

`notebooklm/report.md`、`topology.md`、`study-guide.md` 可以来自 NotebookLM query 后的结构化整理；`notebooklm/artifacts/` 保存正式 NotebookLM Studio artifact 下载结果。

若这些文件包含 agent 改写、结构化整理或推断，frontmatter 使用 `origin: notebooklm-with-agent-edit`；只有未改写的 NotebookLM 原始导出才使用 `origin: notebooklm`。

## 阶段 6：本地二次消化

agent 基于本地文件写：

- `notes/questions.md`：后续可继续追问的问题。
- `notes/my-notes.md`：若用户已有表达，保留用户原话；若没有，先留空或写“待用户补充”。
- `synthesis.md`：知识卡片，区分 NotebookLM 输出与 agent 推断。

`synthesis.md` 是本地沉淀的核心，不是 NotebookLM 单次回答的复制，也不是普通观看笔记。它应能被未来 Codex/Gemini 直接复用。

## 阶段 7：topic 建议

agent 自动生成 topic 建议，不要求用户一开始分类。建议生成后默认视为 approved，并在最终回复展示给用户；若用户有疑问或觉得不对，再修订 `approved` 与 topic 索引。

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
  approved:
    - ai-agents
    - personal-knowledge-system
```

默认立即更新 `topics/<topic>/index.md` 的 approved 关联。MVP 每次处理结束都必须展示默认 approved topics；用户提出疑问、改名、合并、拆分或删除要求时，再回写修订结果。

## 阶段 8：发布边界

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

## 阶段 9：收尾记录

每次处理结束，更新：

- `source.yaml` 的状态。
- `source_ids`、`primary_source_id` 与任何 cleanup candidate。
- `notes/process-log.md`。
- `notebooklm/artifacts/` 的下载清单。
- `vault/notebooklm/notebooks.yaml`。
- topic proposed/approved 状态。
- 已展示给用户的 approved topics 与后续修订入口。

完成声明必须附带实际产物路径。
