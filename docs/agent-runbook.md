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
   - `docs/repository-model.md`
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
5. 若本机已有 `~/.agents/skills/notebooklm-pipeline/SKILL.md`，新对话可直接用该 skill 执行本 runbook；本文件仍是项目内的正式流程说明。

## Repository / Merge 边界

本项目有两个 GitHub 投影：

- private living instance：`MochenRay/notebooklm-personal`
- public template：`MochenRay/notebooklm-personal-template`

以后用户在本项目说“merge”，默认先 merge 到 private living instance。随后只把 public-safe 内容同步到 public template。

不要把当前 `HEAD` 直接推到 public template，因为当前 `HEAD` 可能包含真实 `vault/` digest。公开模板仓只能包含工具代码、Viewer、脚本、文档、模板与空 `vault/` 壳。

具体规则见 `docs/repository-model.md`。

## 默认策略

- 默认新建本地 session。
- 默认通过 `nlm` CLI 创建 NotebookLM notebook。
- 默认将 URL 添加为 source。
- 默认在 source ready 后立即生成正式 NotebookLM Studio artifacts，不需要用户额外唤起。
- 默认下载 artifacts 到本地 `notebooklm/artifacts/`，再继续二次消化。
- 默认只生成本地沉淀，不生成发布草稿。
- 默认不删除、不公开分享、不邀请协作者、不发布社媒；唯一例外是同一次运行中由失败 add-source 尝试留下、且 fallback 成功后可明确识别为非 primary 的 source 残留，此类残留视为已预授权自动清理。
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
nlm source add --profile learning <notebook_id> --url "<URL>" --wait --wait-timeout 900
```

等待 source 可查询，并把返回的 source id 写入 `source_ids`。若 notebook 只有一个 ready source，它就是 `primary_source_id`。

异常处理：

- 若 YouTube-specific 添加方式或其他尝试返回 `Error: Could not add url source.`，先用 `nlm source list --profile learning <notebook_id>` 检查远端实际状态，再用 generic `--url` fallback。
- 若 fallback 成功后能明确识别失败尝试留下的额外 source stub，立即自动删除该 stub，不再询问用户，也不在最终回复中暴露为待确认事项：
  ```bash
  nlm source delete --profile learning <failed_source_id> --confirm
  nlm source list --profile learning <notebook_id>
  ```
- 自动删除仅限同一次运行中由失败 add-source 尝试产生、且未被用作 `primary_source_id` 的残留 source。若 source 身份不确定、不是本轮失败尝试产生、或可能被用户/其它流程使用，不自动删除，改为记录异常并向用户说明风险。
- 在 `source.yaml` 记录 `source_note`、清理后的 `source_ids`、`primary_source_id`、`cleanup.auto_deleted_failed_source_ids` 或 `cleanup.unresolved_source_ids`；在 `notes/process-log.md` 记录失败命令、fallback、delete 命令和删除后 `source list` 验证结果。
- 后续 query 与 artifacts 生成必须显式使用 `--source-ids <primary_source_id>`，避免额外 source 污染结果。
- 除上述失败残留自动清理外，删除 NotebookLM source/notebook 是不可逆动作；未获用户明确确认前禁止删除。

### 4. 生成并下载正式 artifacts

source ready 后，默认生成以下 NotebookLM Studio artifacts：

```bash
nlm report create --profile learning <notebook_id> --format "Study Guide" --source-ids <primary_source_id> --confirm
nlm quiz create --profile learning <notebook_id> --count 10 --difficulty 3 --source-ids <primary_source_id> --confirm
nlm flashcards create --profile learning <notebook_id> --difficulty hard --source-ids <primary_source_id> --confirm
nlm mindmap create --profile learning <notebook_id> --title "<short title>" --source-ids <primary_source_id> --confirm
```

随后查询 artifact 状态并记录 artifact IDs：

```bash
nlm studio status --profile learning <notebook_id> --json
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

若 `notebooklm/report.md` 或 `notebooklm/topology.md` 已由 agent 改写、结构化整理或补充推断，frontmatter 使用 `origin: notebooklm-with-agent-edit`；只有未改写原始导出才使用 `origin: notebooklm`。

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

更新 topic 索引时，必须做语义合并：

- 先读旧 `index.md` 与本 session 的 `synthesis.md`。
- `## 关联 sessions` 可追加新 session 路径。
- `## 当前理解` 必须重写成跨 session 的完整论述，按概念关系组织共识、分歧、边界和可迁移原则。
- 不要用“新 session 补充”“某某 session 进一步强调”“本 session 的核心范式”这类来源顺序作为正文结构。
- 若新材料只是支持既有判断，合并到原观点；若与既有判断冲突，写入分歧或边界；若暂时无法整合，放入 `## 待合并 / 待拆分`，不要把未经消化的段落直接追加到 `## 当前理解`。

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
- 不删除 notebook/source/artifact；同一次运行中失败 add-source 尝试留下的非 primary source 残留除外，按异常处理规则自动清理。
- 不把完整 transcript 放进 publish。
- 不把 agent 推断写成用户观点。
- 不把 CLI context 当作唯一状态。
