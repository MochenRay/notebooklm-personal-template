# Agent Runbook

## 用途

本文件给 Codex、Gemini、Claude 等 agent 使用。当用户提供 URL 并说“NotebookLM Pipeline”时，按此流程执行。

`docs/experiment-plan.md` 是面向用户的项目汇报与路线图。若本 runbook 或其他 agent-facing 文档改变了目标、阶段、流程、工具取舍或输出结构，必须同步更新 `docs/experiment-plan.md`。

## 触发语

示例：

```text
用 NotebookLM Pipeline 处理这个视频：
<URL>
```

```text
这个 YouTube 有价值，用 NotebookLM Pipeline 消化一下。
<URL>
```

若用户只给 YouTube URL，没有 topic，不要停下要求用户分类。先按默认流程执行。MVP 阶段只支持 YouTube URL；其他来源先记录为后续扩展。

## 前置检查

1. 读取本项目：
   - `README.md`
   - `docs/experiment-plan.md`
   - `docs/pipeline.md`
   - `docs/vault-schema.md`
   - `docs/publishing-policy.md`
2. 检查 `nlm` 是否可用：
   ```bash
   nlm --version
   nlm login --check
   nlm notebook list
   ```
3. MVP 使用 `nlm` CLI-first。MCP tools 可用时可辅助，但第一验收以 CLI 路径为准。
4. 若未认证，提示运行：
   ```bash
   nlm login --profile learning
   ```

## 默认策略

- 默认新建本地 session。
- 默认通过 `nlm` CLI 创建 NotebookLM notebook。
- 默认将 URL 添加为 source。
- 默认在 source ready 后立即生成正式 NotebookLM Studio artifacts，不需要用户额外唤起。
- 默认下载 artifacts 到本地 `notebooklm/artifacts/`，再继续二次消化。
- 默认只生成本地沉淀，不生成发布草稿。
- 默认不删除、不公开分享、不邀请协作者、不发布社媒。
- 默认一条 source 一个 Notebook。
- 默认 topic 由 agent 提议并直接写入 approved，处理结束时展示给用户；用户有疑问或觉得不对再修订。
- 默认 `synthesis.md` 写成知识卡片，不写成普通观看笔记。

## 执行步骤

### 1. 建 session

创建：

```text
vault/sessions/YYYY/MM/<slug>/
  source.yaml
  raw/
  notebooklm/
    artifacts/
  notes/
  publish/
```

并写入 `source.yaml` 初稿。

### 2. 创建 notebook

MVP 阶段一条 source 一个 Notebook，默认新建 NotebookLM notebook。若发现明显应复用旧 notebook，只记录为后续聚合建议，不阻断 MVP。

记录：

- `notebook_id`
- `notebook_title`
- `profile`
- `source_ids`

### 3. 添加 source

通过 CLI：

```bash
nlm source add <notebook_id> --url "<URL>"
```

等待 source 可查询。失败时写入 `notes/process-log.md`。

### 4. 生成并下载正式 artifacts

source ready 后，默认生成以下 NotebookLM Studio artifacts：

```bash
nlm report create <notebook_id> --format "Study Guide" --confirm
nlm quiz create <notebook_id> --count 10 --difficulty 3 --confirm
nlm flashcards create <notebook_id> --difficulty hard --confirm
nlm mindmap create <notebook_id> --confirm
```

随后查询 artifact 状态并记录 artifact IDs：

```bash
nlm studio status <notebook_id> --json
```

当 artifact ready 后下载到本地 vault：

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

`notes/process-log.md` 必须记录 create/status/download 命令、artifact IDs、ready/failed 状态和任何 fallback。若某个 artifact 失败，不要阻断全部流程；记录失败并继续可完成部分。

### 5. 追问 NotebookLM

至少生成以下内容：

- 核心摘要。
- 知识拓扑。
- 可迁移观点。
- 反例、争议、薄弱假设。
- 后续追问。

保存到：

```text
notebooklm/report.md
notebooklm/topology.md
notes/questions.md
```

### 6. 写 synthesis

写知识卡片式 `synthesis.md`，必须区分：

- source 事实。
- NotebookLM 输出。
- agent 推断。
- 用户原话。

若用户没有给个人观点，不要伪造为用户观点。

`synthesis.md` 默认结构见 `templates/synthesis-card.md`。它应强调命题、适用场景、证据、边界、迁移用法、关联 topic 与置信度。

### 7. 提议 topics

写入 `source.yaml`：

```yaml
topics:
  proposed:
    - id: "<topic-id>"
      confidence: 0.0
      reason: "<why this topic fits>"
  approved:
    - "<topic-id>"
```

若已有 `vault/topics/<topic>/index.md`，标注“复用既有 topic”。默认把 proposed topic id 同步写入 `approved`，并更新 `vault/topics/<topic>/index.md` 的 approved 关联。

处理结束前，必须展示已默认批准的 topics。用户若提出疑问、改名、合并、拆分或删除要求，再修订 `source.yaml`、`synthesis.md`、`vault/notebooklm/notebooks.yaml` 与对应 topic 索引。

### 8. 发布边界

NotebookLM Pipeline 不默认生成 `publish/website.md`。若内容有公开价值，只在 `synthesis.md` 或 `source.yaml` 中标注 `publish_candidate: true` 并说明理由。

只有用户明确要求发布或调用后续发布 skill 时，才生成 `publish/website.md` 与 `publish/metadata.json`。

### 9. 收尾

更新：

- `source.yaml`
- `notes/process-log.md`
- `notebooklm/artifacts/`
- `vault/notebooklm/notebooks.yaml`
- `topics.proposed`、`topics.approved` 与最终回复中的 topic 展示

最终回复必须列出实际创建/更新的文件路径。

## 需要询问用户的情况

只在以下情况问：

- URL 内容敏感或涉及未公开项目。
- 是否进入公开候选存在明显风险。
- 需要用户提供权限、登录或人工网页操作。

不要因为 topic 不确定而停下；先写 proposed，并默认同步为 approved。处理结束时展示 approved topics，等待用户后续异议即可。

## 禁止事项

- 不自动发布。
- 不自动公开分享 NotebookLM notebook。
- 不删除 notebook/source/artifact。
- 不把完整 transcript 放进 publish。
- 不把 agent 推断写成用户观点。
- 不把 CLI context 当作唯一状态。
