# Vault Schema

## 设计原则

本地 vault 分稳定层与漂移层：

```text
sessions/
  稳定层。一次学习事件一目录，按时间归档，不因 topic 变化而搬迁。

topics/
  漂移层。跨 session 聚合领域理解，可由 agent 建议、默认批准展示、后续按异议重命名。

notebooklm/
  远端 NotebookLM notebook 与本地 session 的映射。

publish/
  显式发布时才生成的公开草稿，只供网站或社媒读取。
```

## 目录结构

```text
vault/
  sessions/
    2026/
      05/
        youtube-ai-agents-memory/
          source.yaml
          raw/
            transcript.md
          notebooklm/
            report.md
            topology.md
            artifacts/
              artifact-status.json
              audio.m4a
          notes/
            process-log.md
            questions.md
            my-notes.md
            debate.md
          synthesis.md
          publish/              # 仅显式发布时生成
            website.md
            metadata.json

  topics/
    ai-agents/
      index.md
      topology.md
    personal-knowledge-system/
      index.md
      topology.md

  notebooklm/
    notebooks.yaml
```

## `source.yaml`

每个 session 必有 `source.yaml`。

标题字段分工：

- `title` 保存来源原始标题。
- `title_zh` 保存中文展示标题，Vault Viewer 默认读取它作为 session 标题。
- `notebook_title` 保留 NotebookLM 远端标题；`notebook_title_zh` 保存本地中文展示标题。
- `why_it_matters` 保存中文展示摘要，供列表页直接读取；英文原文标题、命令、路径和专有名词可保留，但不要整句英文。
- topic id 保留英文 slug；`vault/topics/<topic-id>/index.md` 的一级标题写中文展示名。

```yaml
id: youtube-ai-agents-memory
captured_at: "2026-05-14"
source_type: youtube
url: "https://www.youtube.com/watch?v=..."
title: ""
title_zh: ""
author: ""
published_at: ""
language: ""
why_it_matters: ""

notebooklm:
  notebook_id: ""
  notebook_title: ""
  notebook_title_zh: ""
  source_ids: []
  primary_source_id: ""
  source_note: ""
  cleanup:
    auto_deleted_failed_source_ids: []
    unresolved_source_ids: []
    cleanup_note: ""
  research:
    strategy: source-grounded-fast-web
    seed_queries: []
    tasks:
      - query: ""
        task_id: ""
        source: web
        mode: fast
        status: pending
        import_policy: selective-indices
        imported_indices: []
        imported_source_ids: []
        note: ""
    selected_source_ids: []
    selection_note: ""
  created_by: nlm
  profile: learning
  artifacts:
    audio:
      id: ""
      status: pending
      format: deep_dive
      length: default
      source_ids: []
      path: notebooklm/artifacts/audio.m4a

topics:
  proposed:
    - id: ai-agents
      title_zh: AI 智能体
      confidence: 0.86
      reason: ""
    - id: personal-knowledge-system
      title_zh: 个人知识系统
      confidence: 0.72
      reason: ""
  approved:
    - ai-agents
    - personal-knowledge-system

tags:
  - youtube
  - notebooklm

rights:
  public_url: true
  transcript_publication_allowed: false
  quote_policy: short_quotes_only
  raw_transcript_saved: false

status:
  stage: captured
  publish_candidate: false
  publish_reason: ""
  topic_review: auto_approved
```

## Git 与开源边界

本项目准备 Git 化和开源。项目文档、模板、脚本、示例 schema 可进 Git；私人 truth vault 与版权/隐私敏感材料默认不进 Git。

推荐边界：

```text
notebooklm-personal/
  README.md                 # 可进 Git
  docs/                     # 可进 Git
  templates/                # 可进 Git
  scripts/                  # 可进 Git
  examples/                 # 只放脱敏样例
  vault/                    # 私人 truth vault，默认 gitignore
```

若未来需要公开示例，使用 `examples/` 放脱敏小样，不直接公开真实 `vault/`。

## `raw/`

保存 source 快照。MVP 可为空，但若 transcript 可合法取得，建议保存：

- `transcript.md`
- `source.html`
- `metadata.json`

`raw/` 不默认公开。

## `notebooklm/`

保存 NotebookLM 输出或 agent 从 NotebookLM 查询后整理的结果。

推荐文件：

- `report.md`
- `topology.md`
- `artifacts/artifact-status.json`
- `artifacts/audio.m4a`
- `slides.pdf`
- `slides.pptx`

每个 Markdown 文件建议保留头部：

```markdown
---
origin: notebooklm
edited: false
generated_at: "2026-05-14"
notebook_id: ""
---
```

`origin: notebooklm` 只用于未改写的 NotebookLM 原始导出。若 agent 对 NotebookLM query 结果做了结构化整理、删改或补充推断，使用：

```markdown
---
origin: notebooklm-with-agent-edit
edited: true
generated_at: "2026-05-14"
notebook_id: ""
source_id: ""
conversation_id: ""
---
```

若内容是 agent 综合，而非 NotebookLM 原文输出：

```markdown
---
origin: agent-synthesis
based_on:
  - notebooklm/report.md
  - notebooklm/topology.md
---
```

### `notebooklm/artifacts/`

`notebooklm/artifacts/` 保存正式 NotebookLM Studio artifacts 的下载结果。当前默认只生成并下载：

- audio：`nlm audio create --profile learning <notebook_id> --format deep_dive --length default --source-ids <selected_source_ids> --confirm`，下载为 `audio.m4a`。

`artifact-status.json` 建议保存 `nlm studio status <notebook_id> --json` 的结果或其精简版，至少包含 artifact id、type、status、downloaded_paths、generated_at、downloaded_at。若某项失败，保留失败状态与错误摘要。

旧 session 或显式请求仍可保留 report、quiz、flashcards、mind map、slides 等 artifacts；Viewer 和 health check 应兼容这些历史产物，但它们不再属于默认 Pipeline。

### `notebooklm.research`

`notebooklm.research` 记录 Web Fast Research 的过程。默认策略是先基于主 YouTube source 生成 research queries，再选择性导入候选来源，而不是只用 YouTube title 搜索或盲目全量 import。

关键字段：

- `strategy`：默认 `source-grounded-fast-web`。
- `seed_queries`：由 NotebookLM 基于 `primary_source_id` 生成的 3-5 个英文 query。
- `tasks`：每次 `nlm research start/status/import` 的记录，含 query、task id、mode、source、status、import policy、imported indices 与 imported source ids。
- `selected_source_ids`：最终用于综合与 audio 的 source id 清单，通常包含 `primary_source_id` 与筛选后的 research source ids。
- `selection_note`：为什么选择这些 source，及是否跳过低质/重复候选。

若 source 添加过程中出现失败后远端残留，fallback 成功后应自动删除可明确识别的失败残留 source。`source_ids` 保留清理后的远端实际 source 清单，`primary_source_id` 指向后续 query 与 artifacts 使用的 ready source，`source_note` 说明失败命令、fallback、被自动删除的 failed source id、删除命令与删除后验证结果。结构化字段写入 `cleanup.auto_deleted_failed_source_ids`；无法自动清理时写入 `cleanup.unresolved_source_ids` 与 `cleanup.cleanup_note`，并说明未自动删除原因。只有无法确认身份、不是本轮失败尝试产生、或可能被用户/其它流程使用的 source 才保留为异常。删除其它 source/notebook 仍是不可逆操作，必须等用户明确确认。

`notebooklm/report.md`、`notebooklm/topology.md` 若经过 agent 整理供 Viewer 阅读，Markdown 标题默认使用中文结构标签，例如 `核心报告`、`知识拓扑`、`来源事实`、`NotebookLM 归纳`、`Agent 推断`。不要把 `Source facts`、`NotebookLM synthesis`、`Agent inference` 等英文结构标题写入最终展示文件。

## `notes/`

保存过程与个人消化：

- `process-log.md`：命令、MCP 调用、失败、fallback。
- `questions.md`：后续追问。
- `my-notes.md`：用户自己的理解。若用户未表达，不伪造为用户观点。
- `debate.md`：赞同、反对、反例、薄弱假设。

## `synthesis.md`

本地学习单元的核心文件。它是未来复用的知识卡片，不是普通学习笔记。

应包含：

- 命题。
- 适用场景。
- 来源证据。
- 反例与边界。
- 可迁移用法。
- 关联 topics（正文标题可写 `建议归类`、`已确认`；结构化字段仍保留 `proposed` / `approved`）。
- 置信度。
- 未解决问题。
- 是否适合公开及理由。

## `topics/`

topic 是漂移层，不是路径真相。agent 建议 topic 后默认写入 approved 并展示给用户；用户有疑问或觉得不对时，再改名、合并、拆分或移除。

`topics/<topic>/index.md` 是跨 session 的语义综合，不是 session changelog。新增 session 命中既有 topic 时，agent 必须重写并整合 `## 当前理解`，让它形成有逻辑关系的完整论述；不要按“某 session 补充了……”逐段追加。

写作规则：

- `## 关联 sessions` 只负责溯源和状态，不承担正文论述。
- `## 当前理解` 先写 topic 的核心命题，再写共识、分歧、边界和可迁移原则。
- 多个 session 共同支持同一判断时，合并成一个观点；不要重复列来源。
- 多个 session 意见不同或重心不同，写成“分歧 / 边界 / 适用场景差异”，不要写成时间顺序记录。
- 避免把“新 session 补充”“某某访谈进一步强调”“本 session 的核心范式”作为段落组织方式。需要保留来源时，放在 `## 关联 sessions` 或简短证据索引中。
- 若证据不足以整合，先保留旧论述，并在 `## 待合并 / 待拆分` 标注待整理点；不要把未经消化的新段落塞进 `## 当前理解`。

`topics/<topic>/index.md` 建议结构：

```markdown
# AI Agents

## 状态

- 类型：proposed / approved / deprecated
- 最近整理：

## 关联 sessions

- `vault/sessions/2026/05/youtube-ai-agents-memory/` - approved

## 当前理解

跨 session 形成的完整论述。优先按概念关系组织，而不是按 session 来源组织。

## 分歧与边界

不同来源的重心差异、适用场景差异、待验证判断。

## 可迁移原则

可复用到项目、写作、产品、工程或个人知识系统的操作性原则。

## 待合并 / 待拆分
```

## `notebooklm/notebooks.yaml`

记录远端 notebook 与本地 session 的映射。

```yaml
notebooks:
  - notebook_id: ""
    title: "2026-05 - AI agent memory"
    title_zh: "2026-05 - AI Agent 记忆"
    profile: learning
    status: active
    source_ids:
      - ""
    primary_source_id: ""
    topics:
      proposed:
        - ai-agents
      approved:
        - ai-agents
    sessions:
      - vault/sessions/2026/05/youtube-ai-agents-memory
    notes: ""
```

此文件用于避免重复创建 notebook，也用于判断是否复用旧 notebook。

## `publish/`

`publish/` 不属于默认 NotebookLM Pipeline。只有用户明确要求发布，或后续调用发布 skill，才生成此目录内容。

公开层只读 `publish/`，不读完整 session。

`publish/metadata.json`：

```json
{
  "title": "",
  "slug": "",
  "summary": "",
  "source_url": "",
  "topics": [],
  "tags": [],
  "visibility": "draft",
  "published_at": null
}
```
