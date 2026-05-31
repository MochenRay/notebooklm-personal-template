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
   nlm notebook list --profile learning --json
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
- 默认在主 source ready 后先抽取 Web Fast Research queries，再导入筛选后的相关信源。
- 默认生成并落盘完整 NotebookLM Studio artifact pack：Study Guide/report、quiz、flashcards、mind map 和 Audio Overview。前四类 artifact 必须在本轮 session 内下载到 `notebooklm/artifacts/`；Audio Overview 在当前 session 只尝试发起一次，命令显式传 `--language zh-CN` 生成中文音频。若创建成功并返回 artifact id，写入 `source.yaml` 与 `vault/notebooklm/audio-index.yaml`，记录 `requested` / `in_progress`；若创建受阻或 rate limited，一次失败即写 `rate_limited_pending_retry` / `audio_create_blocked` health finding，不反复重试，不写 audio-index，不等待 completed、不公开 notebook、不写 share URL。
- 若用户说“不要视频 / 只要音频”，只关闭 Video Overview；仍必须生成并落盘 Study Guide/report、quiz、flashcards、mind map。
- 默认只生成本地沉淀，不生成发布草稿。
- 默认不删除 notebook/source/artifact、不邀请协作者、不发布社媒；唯一例外是同一次运行中由失败 add-source 尝试留下、且 fallback 成功后可明确识别为非 primary 的 source 残留，此类残留视为已预授权自动清理。NotebookLM notebook link access 只在旧 pending audio 被后续补档确认为 completed 后公开，用于让 artifact 播放链接可访问。
- 默认一条主 source 一个 Notebook；Fast Research 增补来源保留在同一个 notebook 内。
- 默认 topic 由 agent 提议并直接写入 approved，处理结束时展示给用户；用户有疑问或觉得不对再修订。
- 默认 `synthesis.md` 写成知识卡片，不写成普通观看笔记。
- 默认为新入库视频生成中文展示标题：`source.yaml` 保留原始 `title`，同时写 `title_zh`；Notebook title 可保留远端英文，但本地记录写 `notebook_title_zh`。

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

标题规则：

- `title` 保存原始视频标题或来源标题。
- `title_zh` 保存给 Viewer 展示的中文标题；英文视频也必须写，不等用户另行要求。
- `notebooklm.notebook_title_zh` 保存本地可读的中文 notebook 标题。
- `why_it_matters` 是 Viewer 列表摘要材料，必须写中文完整句；英文原文标题、技术术语和专有名词可保留，但不要整句英文。
- `synthesis.md`、`notebooklm/report.md`、`notebooklm/topology.md` 的展示标题和结构标题默认使用中文。`notebooklm/report.md` 与 `notebooklm/topology.md` 只承载来源事实和 NotebookLM 归纳；agent/GPT 的推断、迁移和边界写入 `synthesis.md`。若需区分来源，用 `来源事实`、`NotebookLM 归纳`、`Agent 推断`、`用户原话`；不要留下 `Source facts`、`NotebookLM synthesis`、`Agent inference` 这类英文结构标题。
- 英文技术术语、原文概念、命令、路径和专有名词可保留在正文或 code span 中；但章节标题若是阅读结构而非原文术语，应翻成中文。

### 2. 创建 notebook

MVP 阶段一条主 source 一个 Notebook，默认新建 NotebookLM notebook。Fast Research 增补来源保留在同一个 notebook 内；若发现明显应复用旧 notebook，只记录为后续聚合建议，不阻断 MVP。

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
- 生成 research queries 时必须显式使用 `--source-ids <primary_source_id>`，避免新增来源反向污染主视频判断。
- 除上述失败残留自动清理外，删除 NotebookLM source/notebook 是不可逆动作；未获用户明确确认前禁止删除。

### 4. 抽取 research queries 并导入新来源

主 source ready 后，先只基于 `primary_source_id` 让 NotebookLM 生成 3-5 个 Web Fast Research query。不要只用 YouTube title 当唯一搜索词。

```bash
nlm notebook query --profile learning <notebook_id> \
  --source-ids <primary_source_id> \
  "请基于这个视频提取 3-5 个适合 Web Fast Research 的英文搜索 query。每个 query 应包含核心命题、关键人物/公司/论文/产品、可验证事实或反方边界，避免只重复视频标题。"
```

对 2-3 个高质量 query 跑 Web Fast Research：

```bash
nlm research start "<query>" --profile learning --notebook-id <notebook_id> --source web --mode fast
nlm research status --profile learning <notebook_id> --full
```

默认由 agent 审候选后导入指定 indices，优先选择官方/原始/高可信来源和能校验原视频主张的来源：

```bash
nlm research import --profile learning <notebook_id> <task_id> --indices 0,2,5
```

只有用户明确要省心批处理，或候选来源无需筛选时，才用：

```bash
nlm research start "<query>" --profile learning --notebook-id <notebook_id> --source web --mode fast --auto-import
```

`source.yaml` 必须记录 `notebooklm.research.strategy`、`seed_queries`、`tasks`、`selected_source_ids` 与 import policy。`source_ids` 更新为远端实际 sources，`primary_source_id` 仍指向原 YouTube source。若 research 失败，记录失败并继续主 source 流程。

### 5. 追问 NotebookLM

至少生成以下内容：

- 只基于主 YouTube source 的核心摘要。
- 只基于新增 research sources 的支持、修正与反驳。
- 基于全部 sources 的知识拓扑。
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
写入前检查一次 Markdown 标题：阅读型结构标题必须中文化，尤其是 `Source facts`、`NotebookLM synthesis`、`Agent inference`、`Core Report`、`Knowledge Topology`。

### 6. 生成并落盘 Studio artifacts

默认 artifact 集合：

- Study Guide/report：`notebooklm/artifacts/report-study-guide.md`
- Quiz：`quiz.json`、`quiz.md`、必要时保留 `quiz.html`
- Flashcards：`flashcards.json`、`flashcards.md`、必要时保留 `flashcards.html`
- Mind map：`mindmap.json`
- Audio Overview：当前 session 只尝试发起一次中文音频生成。成功返回 artifact id 时记录 pending 并进入后续补档；创建受阻时记录 create-blocked health finding，不反复重试。后续补档完成后只写 share URL，本地不保存音频二进制。

非音频 artifact 必须在本轮 session 内创建、下载和记录。Audio 可基于全部 sources，也可由 agent 根据 source 质量筛选 `primary_source_id + research.selected_source_ids` 后生成。

```bash
nlm report create --profile learning <notebook_id> --format "Study Guide" --source-ids <selected_source_ids> --confirm
nlm quiz create --profile learning <notebook_id> --count 10 --difficulty 3 --source-ids <selected_source_ids> --confirm
nlm flashcards create --profile learning <notebook_id> --difficulty hard --source-ids <selected_source_ids> --confirm
nlm mindmap create --profile learning <notebook_id> --title "Mind Map" --source-ids <selected_source_ids> --confirm
nlm studio status --profile learning <notebook_id> --json
nlm download report <notebook_id> --id <report_artifact_id> --output "vault/sessions/YYYY/MM/<slug>/notebooklm/artifacts/report-study-guide.md"
nlm download quiz <notebook_id> --id <quiz_artifact_id> --format json --output "vault/sessions/YYYY/MM/<slug>/notebooklm/artifacts/quiz.json"
nlm download quiz <notebook_id> --id <quiz_artifact_id> --format markdown --output "vault/sessions/YYYY/MM/<slug>/notebooklm/artifacts/quiz.md"
nlm download quiz <notebook_id> --id <quiz_artifact_id> --format html --output "vault/sessions/YYYY/MM/<slug>/notebooklm/artifacts/quiz.html"
nlm download flashcards <notebook_id> --id <flashcards_artifact_id> --format json --output "vault/sessions/YYYY/MM/<slug>/notebooklm/artifacts/flashcards.json"
nlm download flashcards <notebook_id> --id <flashcards_artifact_id> --format markdown --output "vault/sessions/YYYY/MM/<slug>/notebooklm/artifacts/flashcards.md"
nlm download flashcards <notebook_id> --id <flashcards_artifact_id> --format html --output "vault/sessions/YYYY/MM/<slug>/notebooklm/artifacts/flashcards.html"
nlm download mind-map <notebook_id> --id <mindmap_artifact_id> --output "vault/sessions/YYYY/MM/<slug>/notebooklm/artifacts/mindmap.json"
```

下载后更新 `source.yaml` 中 `notebooklm.artifacts.report`、`quiz`、`flashcards`、`mindmap` 的 artifact id、status、path/files 与 `downloaded_at`，并把完整 studio 状态写到 `notebooklm/artifacts/artifact-status.json`。

随后发起 Audio Overview：

```bash
nlm audio create --profile learning <notebook_id> \
  --format deep_dive \
  --length default \
  --language zh-CN \
  --source-ids <selected_source_ids> \
  --confirm
```

Audio create 只尝试一次。若命令成功返回 audio artifact id，写 `source.yaml` 的 `notebooklm.artifacts.audio.status`、`id`、`language: zh-CN`、`source_ids`、`created_at` / `checked_at`，并把同一条记录追加或更新到 `vault/notebooklm/audio-index.yaml`。若命令返回 rate limit、quota、create failed 或其它未创建 artifact 的错误，写 `status: rate_limited_pending_retry` 或对应 create-blocked 状态，`status.stage: synthesized_audio_create_blocked`，记录到 `notes/process-log.md` 与 `artifact-status.json`；不要在同一轮反复重试，不写 audio-index，因为没有 artifact id 可供 backfill。`npm run build:data` 应把它暴露为 `audio_create_blocked` health warning。不要在当前 session 里跑 `nlm studio status` 等待 completed，不要执行 `nlm share public`，不要写 `share_url`。

处理新 session 开始前，先运行 `npm run audio:backfill -- --exclude <current-session-dir>`。该命令只读取 `vault/notebooklm/audio-index.yaml` 的旧 pending 记录；completed audio 才调用 `npm run share:artifacts -- <session-dir>` 写回 `share_url` 与 sharing metadata，failed/in_progress/not_found 只更新 index 与对应旧 `source.yaml` 状态。当前 session 永远通过 `--exclude` 排除。

### 7. 写 synthesis

写知识卡片式 `synthesis.md`，必须区分：

- source 事实。
- NotebookLM 输出。
- agent 推断。
- 用户原话。

若用户没有给个人观点，不要伪造为用户观点。

`synthesis.md` 默认结构见 `templates/synthesis-card.md`。写作顺序上，先读 `notebooklm/report.md` 与 `notebooklm/topology.md`，再写 agent/GPT 的二阶洞察；不要把 NotebookLM 已经给出的 `来源事实`、`NotebookLM 归纳` 再复制进正文。它应只保留 GPT 增量判断、可迁移用法、边界与反例、下一步问题和 Topic 归档。

### 8. 提议 topics

写入 `source.yaml`：

```yaml
topics:
  proposed:
    - id: "<topic-id>"
      title_zh: "<中文主题名>"
      confidence: 0.0
      reason: "<why this topic fits>"
  approved:
    - "<topic-id>"
```

若已有 `vault/topics/<topic>/index.md`，标注“复用既有 topic”。默认把 proposed topic id 同步写入 `approved`，并更新 `vault/topics/<topic>/index.md` 的 approved 关联。

topic 关联数量采用维护者软上限，不在 Viewer 暴露：同一 topic 超过 10 条 approved sessions 时，运行 `npm run audit:topics` 做拆分评估；新 session 收尾前可运行 `npm run audit:topics -- --session vault/sessions/YYYY/MM/<session-id>`。若命中过载 topic，先看 audit 输出中的共同 topic、该 topic 的 `## 待合并 / 待拆分`、以及现有更窄 topic；若更窄 topic 已存在，优先写更窄 topic；若没有稳定归属，可提出新的 flat topic，并同步调整相关 `source.yaml`、`vault/notebooklm/notebooks.yaml` 与 topic index。不要因过载停止本轮处理，也不要把审计信号写进 Viewer health。

更新 topic 索引时，必须做语义合并：

- 先读旧 `index.md` 与本 session 的 `synthesis.md`。
- `## 关联 sessions` 可追加新 session 路径。
- `# <topic title>` 一级标题必须是中文展示名；目录名仍保留英文 slug，不因改名搬迁 session。
- 正文必须重写为 `## 核心命题`、`## 判断框架`、`## 证据综合`、`## 分歧与边界`、`## 可迁移原则`。
- `## 核心命题` 回答当前稳定判断；`## 判断框架` 拆可复用维度；`## 证据综合` 按证据簇归纳，不逐条复述 session。
- 不要用“新 session 补充”“某某 session 进一步强调”“本 session 的核心范式”这类来源顺序作为正文结构。
- 若新材料只是支持既有判断，合并到原观点；若与既有判断冲突，写入分歧或边界；若暂时无法整合，放入 `## 待合并 / 待拆分`，不要把未经消化的段落直接追加到正文。
- 每个已 approved 该 topic 的 session 都必须出现在 `## 关联 sessions`，否则 build health 会报 `topic_missing_approved_session_reference`。
- 同一 session 在 `## 关联 sessions` 只保留一条引用；重复引用由 `npm run audit:topics` 检出，先清重复引用，再继续拆分评估。

处理结束前，必须展示已默认批准的 topics。用户若提出疑问、改名、合并、拆分或删除要求，再修订 `source.yaml`、`synthesis.md`、`vault/notebooklm/notebooks.yaml` 与对应 topic 索引。

### 9. 发布边界

NotebookLM Pipeline 不默认生成 `publish/website.md`。若内容有公开价值，只在 `synthesis.md` 或 `source.yaml` 中标注 `publish_candidate: true` 并说明理由。

只有用户明确要求发布或调用后续发布 skill 时，才生成 `publish/website.md` 与 `publish/metadata.json`。

### 10. 收尾

更新：

- `source.yaml`
- `notes/process-log.md`
- `notebooklm/artifacts/` 下的 report、quiz、flashcards、mind map、artifact status；Audio Overview 当前 session 若创建成功，只需有 pending 状态、`source_ids` 和 audio-index 记录；若创建受阻，只写 create-blocked 状态并让 health check 报警，不在同一轮反复重试。旧 pending 被补档为 completed 后，只写 `notebooklm.artifacts.audio.share_url` 与 sharing metadata。
- `vault/notebooklm/notebooks.yaml`
- `topics.proposed`、`topics.approved` 与最终回复中的 topic 展示
- 若命中过载 topic，维护者收尾说明必须列出对应 topic 与已做/待做的关联调整；不写入 Viewer health。
- 若改动了 session、topic 或 notebook mapping，运行 `npm run build:data`；若改动 Viewer/projection 行为，再运行 `npm run smoke`。

最终回复必须列出实际创建/更新的文件路径。

## 需要询问用户的情况

只在以下情况问：

- URL 内容敏感或涉及未公开项目。
- 是否进入公开候选存在明显风险。
- 需要用户提供权限、登录或人工网页操作。

不要因为 topic 不确定而停下；先写 proposed，并默认同步为 approved。处理结束时展示 approved topics，等待用户后续异议即可。

## 禁止事项

- 不自动发布。
- NotebookLM notebook link access 只在旧 pending audio 被后续补档确认为 completed 后默认公开，用于让 artifact share URL 可播放；这不等同于生成公开草稿、同步公开模板仓或发布社媒。
- 不删除 notebook/source/artifact；同一次运行中失败 add-source 尝试留下的非 primary source 残留除外，按异常处理规则自动清理。
- 不把完整 transcript 放进 publish。
- 不把 agent 推断写成用户观点。
- 不把 CLI context 当作唯一状态。
