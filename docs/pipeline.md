# NotebookLM Pipeline

## 目标

把“看到一个有价值的 URL”变成一条可复用学习流程：

```text
YouTube URL
  -> agent 创建本地 session
  -> agent 通过 nlm CLI 创建 NotebookLM notebook
  -> NotebookLM 消化 source
  -> agent 基于主 source 抽取 research queries
  -> NotebookLM Web Fast Research 发现并导入相关信源
  -> agent 基于全部 sources 拉回结构化输出
  -> agent 生成并下载 Study Guide/report、quiz、flashcards、mind map
  -> agent 尝试发起一次 Audio Overview；成功则记录 pending 与 audio-index，受阻则记 health warning
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
- 基于主视频抽取 search query，而不是只用 YouTube title。
- 用 Web Fast Research 补充相关信源。
- 生成正式 NotebookLM Studio artifact pack：Study Guide/report、quiz、flashcards、mind map 和 Audio Overview。video、slides、infographic 不默认生成。
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

标题写法：

- `title` 保留来源原始标题。
- `title_zh` 写中文展示标题，供 Vault Viewer 和后续复盘默认使用。
- `notebooklm.notebook_title_zh` 写中文 notebook 展示标题；远端 `notebook_title` 可继续保留创建时标题。
- `why_it_matters` 写中文完整句，供 Vault Viewer 列表页直接展示；不要把英文 oEmbed 摘要或 agent 草稿原样写入该字段。

## 阶段 2：创建 NotebookLM notebook

MVP 阶段一条主 source 一个 Notebook，默认新建 notebook。Fast Research 增补来源保留在同一个 notebook 内，`primary_source_id` 继续指向原 YouTube source。

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
- 若 fallback 成功后能明确识别失败尝试留下的额外 source，立即自动删除该失败残留，不等待用户确认，也不作为最终回复中的待确认事项暴露：
  ```bash
  nlm source delete --profile learning <failed_source_id> --confirm
  nlm source list --profile learning <notebook_id>
  ```
- 自动删除只适用于同一次运行中由失败 add-source 尝试产生、且没有作为 `primary_source_id` 使用的 source。若 source 身份不确定、不是本轮失败尝试产生、或可能被用户/其它流程使用，不做自动删除，记录异常并向用户说明风险。
- 若存在多个 source，必须在 `source.yaml` 写 `primary_source_id`，后续 query 与 Studio artifact 生成都用 `--source-ids <primary_source_id>` 显式限定。
- `source.yaml` 与 `notes/process-log.md` 必须记录失败命令、fallback、自动删除命令、被删 source id、删除后 `source list` 验证结果，并让 `source_ids` 反映清理后的远端实际 source 清单。结构化记录优先写入 `cleanup.auto_deleted_failed_source_ids`；无法自动清理时写入 `cleanup.unresolved_source_ids` 与 `cleanup.cleanup_note`。
- 可建议使用 transcript MCP 或手动导出 transcript。
- 不要把失败误写成已完成。

## 阶段 4：抽取 research queries 并导入新来源

添加主 source 且等待 ready 后，agent 先只基于 `primary_source_id` 追问 NotebookLM，生成 3-5 个适合 Web Fast Research 的英文 query。不要只把 YouTube title 当作唯一搜索词。

默认 query 模板：

```bash
nlm notebook query --profile learning <notebook_id> \
  --source-ids <primary_source_id> \
  "请基于这个视频提取 3-5 个适合 Web Fast Research 的英文搜索 query。每个 query 应包含核心命题、关键人物/公司/论文/产品、可验证事实或反方边界，避免只重复视频标题。"
```

随后对 2-3 个高质量 query 执行 Fast Research：

```bash
nlm research start "<query>" --profile learning --notebook-id <notebook_id> --source web --mode fast
nlm research status --profile learning <notebook_id> --full
```

默认不要直接全量导入。先查看候选来源，优先导入官方文档、原始论文、作者原文、产品/公司页面、可信媒体或能直接校验视频核心主张的来源：

```bash
nlm research import --profile learning <notebook_id> <task_id> --indices 0,2,5
```

只有在用户明确要省心批处理、或候选来源无需人工/agent 筛选时，才用自动导入：

```bash
nlm research start "<query>" --profile learning --notebook-id <notebook_id> --source web --mode fast --auto-import
```

记录到 `source.yaml`：

- `notebooklm.research.strategy`
- `notebooklm.research.seed_queries`
- `notebooklm.research.tasks[].query`
- `notebooklm.research.tasks[].task_id`
- `notebooklm.research.tasks[].import_policy`
- `notebooklm.research.tasks[].imported_source_ids`
- `notebooklm.research.selected_source_ids`
- `notebooklm.source_ids` 更新为当前远端实际 sources，`primary_source_id` 仍指向原 YouTube source。

若 research 失败，不阻断主视频消化；记录失败并继续用 primary source 完成本地沉淀与 audio。

## 阶段 5：NotebookLM 追问与消化

默认追问模板：

1. 只基于主 YouTube source：原视频的核心问题、结论和论证结构是什么？
2. 只基于新增 research sources：哪些外部证据支持、修正或反驳原视频？
3. 基于全部 sources：关键概念之间的关系如何？请给出知识拓扑。
4. 基于全部 sources：哪些观点可迁移到我的个人知识系统、AI vibecoding 或当前项目？
5. 基于全部 sources：有哪些反例、争议、薄弱假设和后续追问？

输出优先保存到：

```text
notebooklm/report.md
notebooklm/topology.md
notebooklm/artifacts/
```

`notebooklm/report.md`、`topology.md` 可以来自 NotebookLM query 后的结构化整理；`notebooklm/artifacts/` 保存正式 NotebookLM Studio artifact 状态快照、share URL 与历史下载结果。

若这些文件包含 agent 改写、结构化整理或推断，frontmatter 使用 `origin: notebooklm-with-agent-edit`；只有未改写的 NotebookLM 原始导出才使用 `origin: notebooklm`。

结构标题本地化规则：

- `notebooklm/report.md`、`notebooklm/topology.md` 和 `synthesis.md` 的阅读结构标题默认用中文。
- `notebooklm/report.md` 与 `notebooklm/topology.md` 只承载来源事实和 NotebookLM 归纳；agent/GPT 的推断、迁移和边界写入 `synthesis.md`，避免 Viewer 里 NotebookLM 区和 GPT 洞察区互相复述。
- 区分证据来源时使用 `来源事实`、`NotebookLM 归纳`、`Agent 推断`、`用户原话`。
- 不要在最终 Markdown 标题里留下 `Source facts`、`NotebookLM synthesis`、`Agent inference`、`Core Report`、`Knowledge Topology` 这类英文结构标签；英文原文术语和专有名词可留在正文或 code span。

## 阶段 6：生成并落盘 Studio artifacts

默认 artifact 集合是 Study Guide/report、quiz、flashcards、mind map 和 Audio Overview。前四类 artifact 是同步闭环要求：本轮 session 结束前应创建、下载到 `notebooklm/artifacts/`，并写入 `source.yaml` 与 `artifact-status.json`。Audio Overview 对当前 session 只尝试发起一次：命令必须显式传 `--language zh-CN`。若创建成功并返回 artifact id，写入 `source.yaml` 与 `vault/notebooklm/audio-index.yaml`，记录 pending；若创建受阻、rate limited 或未返回 artifact id，立即写 `rate_limited_pending_retry` / `audio_create_blocked` health warning，不在同一轮反复重试，不写 audio-index，不等待 completed、不公开 notebook、不写 share URL。

若用户说“不要视频 / 只要音频”，只表示跳过 Video Overview；不要把它解释成单音频流程，也不要跳过 Study Guide/report、quiz、flashcards、mind map。

非音频 artifact 生成示例：

```bash
nlm report create --profile learning <notebook_id> \
  --format "Study Guide" \
  --source-ids <selected_source_ids> \
  --confirm
nlm quiz create --profile learning <notebook_id> \
  --count 10 \
  --difficulty 3 \
  --source-ids <selected_source_ids> \
  --confirm
nlm flashcards create --profile learning <notebook_id> \
  --difficulty hard \
  --source-ids <selected_source_ids> \
  --confirm
nlm mindmap create --profile learning <notebook_id> \
  --title "Mind Map" \
  --source-ids <selected_source_ids> \
  --confirm
nlm studio status --profile learning <notebook_id> --json
```

下载落盘示例：

```bash
nlm download report <notebook_id> --id <report_artifact_id> \
  --output "vault/sessions/YYYY/MM/<slug>/notebooklm/artifacts/report-study-guide.md"
nlm download quiz <notebook_id> --id <quiz_artifact_id> --format json \
  --output "vault/sessions/YYYY/MM/<slug>/notebooklm/artifacts/quiz.json"
nlm download quiz <notebook_id> --id <quiz_artifact_id> --format markdown \
  --output "vault/sessions/YYYY/MM/<slug>/notebooklm/artifacts/quiz.md"
nlm download quiz <notebook_id> --id <quiz_artifact_id> --format html \
  --output "vault/sessions/YYYY/MM/<slug>/notebooklm/artifacts/quiz.html"
nlm download flashcards <notebook_id> --id <flashcards_artifact_id> --format json \
  --output "vault/sessions/YYYY/MM/<slug>/notebooklm/artifacts/flashcards.json"
nlm download flashcards <notebook_id> --id <flashcards_artifact_id> --format markdown \
  --output "vault/sessions/YYYY/MM/<slug>/notebooklm/artifacts/flashcards.md"
nlm download flashcards <notebook_id> --id <flashcards_artifact_id> --format html \
  --output "vault/sessions/YYYY/MM/<slug>/notebooklm/artifacts/flashcards.html"
nlm download mind-map <notebook_id> --id <mindmap_artifact_id> \
  --output "vault/sessions/YYYY/MM/<slug>/notebooklm/artifacts/mindmap.json"
```

这些文件是本地学习事实层的一部分，不是可选展示缓存。若某个非音频 artifact 失败，必须在 `notes/process-log.md`、`source.yaml` 与 `artifact-status.json` 写明失败状态和错误摘要，不要把 session 报成完整完成。

Audio 可基于全部 sources，也可由 agent 根据 source 质量筛选 `research.selected_source_ids` 加上 `primary_source_id` 后生成。

```bash
nlm audio create --profile learning <notebook_id> \
  --format deep_dive \
  --length default \
  --language zh-CN \
  --source-ids <selected_source_ids> \
  --confirm
```

当前 session 末尾只记录：

- `source.yaml` 中的 `notebooklm.artifacts.audio.status: requested` 或 `in_progress`、`language: zh-CN`、`source_ids`、`created_at`、`checked_at`。
- `vault/notebooklm/audio-index.yaml` 中的补档队列记录。
- `notes/process-log.md` 中的 create 命令和“不在当前 session 等待音频”的说明。

以上三项只适用于 audio create 成功返回 artifact id 的情况。若 audio create 一次受阻，当前 session 末尾改为记录 `notebooklm.artifacts.audio.status: rate_limited_pending_retry` 或对应 create-blocked 状态、`source_ids`、`checked_at` 与错误摘要；`artifact-status.json` 同步记录；`npm run build:data` 暴露 `audio_create_blocked` health warning；不写 `vault/notebooklm/audio-index.yaml`，因为没有 artifact id 可补档；不在同一轮反复重试。若要基于全部来源，可不传 `--source-ids`，但默认优先显式传入筛选后的 source ids。当前 session 不运行 `nlm share public`，不写 `share_url`，本地不保存音频二进制。

### 既有 session 音频回填

当用户要求批量检查既有 session，或 agent 开始处理新 session 时，先读取 `vault/notebooklm/audio-index.yaml`，排除当前 session，只处理旧 pending 记录：

```bash
npm run audio:backfill -- --exclude "vault/sessions/YYYY/MM/<current-slug>"
```

`audio:backfill` 会对候选旧 notebook 读取 `nlm studio status --json`。只有存在 completed audio 时，才调用 `npm run share:artifacts -- <session-dir>`，执行 `nlm share public`，写回 `source.yaml`、`notebooklm/artifacts/artifact-status.json`、`notes/process-log.md` 和 index 中的 `share_url`。失败或未完成 audio 只记录状态，不公开 notebook，不下载二进制音频。

## 阶段 7：本地二次消化

agent 基于本地文件写：

- `notes/questions.md`：后续可继续追问的问题。
- `notes/my-notes.md`：若用户已有表达，保留用户原话；若没有，先留空或写“待用户补充”。
- `synthesis.md`：知识卡片，区分 NotebookLM 输出与 agent 推断。

`synthesis.md` 是本地沉淀的核心，不是 NotebookLM 单次回答的复制，也不是普通观看笔记。它必须基于 `notebooklm/report.md` 与 `notebooklm/topology.md` 生成 agent/GPT 的二阶洞察：只保留命题、迁移、边界、未解问题和最小依据；若内容与 NotebookLM 输出重复，应删掉或改写为更高一层的判断。它应能被未来 Codex/Gemini 直接复用。

## 阶段 8：topic 建议

agent 自动生成 topic 建议，不要求用户一开始分类。建议生成后默认视为 approved，并在最终回复展示给用户；若用户有疑问或觉得不对，再修订 `approved` 与 topic 索引。

写入 `source.yaml`：

```yaml
topics:
  proposed:
    - id: ai-agents
      title_zh: AI 智能体
      confidence: 0.86
      reason: "内容围绕 agent memory、tool use、workflow orchestration"
    - id: personal-knowledge-system
      title_zh: 个人知识系统
      confidence: 0.72
      reason: "可迁移到本地 vault 与公开知识区"
  approved:
    - ai-agents
    - personal-knowledge-system
```

默认立即更新 `topics/<topic>/index.md` 的 approved 关联。MVP 每次处理结束都必须展示默认 approved topics；用户提出疑问、改名、合并、拆分或删除要求时，再回写修订结果。

topic 数量上限采用维护者软审计，不在 Viewer 暴露：同一 topic 关联超过 10 条 approved sessions 时，运行 `npm run audit:topics` 判断是否需要拆分评估。新 session 收尾前可运行 `npm run audit:topics -- --session vault/sessions/YYYY/MM/<session-id>`；若命中过载 topic，先查看共同 topic 信号、`## 待合并 / 待拆分` 和既有更窄 topic。若内容更契合窄 topic，优先写入窄 topic；若尚无稳定窄 topic，可提出 1 个新的 flat topic，并同步调整相关 `source.yaml`、`vault/notebooklm/notebooks.yaml` 与 topic index。不要因为 topic 过载而阻塞本轮 pipeline，也不要把审计信号写进 Viewer health。

topic 标题展示规则：

- `vault/topics/<topic-id>/index.md` 的一级标题写中文展示名。
- `<topic-id>` 仍是稳定英文 slug，用于路径、URL、source.yaml 关联和可重命名安全性。
- Viewer 读取一级标题作为展示名；若缺中文标题，健康检查会提醒补齐。

topic index 更新采用 semantic merge，而不是 append-only session log：

- `## 关联 sessions` 负责保留来源路径与 approved/proposed 状态。
- 正文必须拆成 `## 核心命题`、`## 判断框架`、`## 证据综合`、`## 分歧与边界`、`## 可迁移原则`。
- `## 核心命题` 写当前稳定判断；`## 判断框架` 写可复用维度；`## 证据综合` 按证据簇归纳，不逐条复述 session。
- 多个 session 共同认可的观点合并写；互相冲突或重心不同的地方写成边界、分歧或适用条件。
- 不要让每个 session 对应一个正文段落，也不要用“新 session 补充了另一条判断”这类表述组织正文。
- 暂时无法整合的材料进入 `## 待合并 / 待拆分`，等待后续专门整理。
- build health 会提醒缺少结构化详情章节、`## 当前理解` 段落数疑似等于 session 数、来源顺序式正文组织，以及 session 已 approved 但 topic index 未列回。topic 数量过载和 `## 关联 sessions` 重复引用只用 `npm run audit:topics` 做维护者审计，不暴露到 Viewer。

## 阶段 9：发布边界

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

## 阶段 10：收尾记录

每次处理结束，更新：

- `source.yaml` 的状态。
- `source_ids`、`primary_source_id`、失败 add-source 残留的自动清理记录，或无法自动清理的异常原因。
- `notes/process-log.md`。
- `notebooklm/artifacts/` 的 report、quiz、flashcards、mind map、artifact status，以及 audio pending 状态或旧补档后的 share URL。
- `vault/notebooklm/notebooks.yaml`。
- topic proposed/approved 状态。
- 若命中过载 topic，在维护者收尾说明里列出对应 topic 与已做/待做的关联调整；不写入 Viewer health。
- 若 session、topic 或 notebook mapping 有变化，运行 `npm run build:data` 刷新 `.viewer-data`；如改动影响 Viewer UI 或 projection contract，再运行 `npm run smoke`。
- 已展示给用户的 approved topics 与后续修订入口。

完成声明必须附带实际产物路径。
