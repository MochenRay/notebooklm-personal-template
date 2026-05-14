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
            study-guide.md
            quiz.json
            flashcards.json
            artifacts/
              artifact-status.json
              report-study-guide.md
              quiz.json
              quiz.md
              quiz.html
              flashcards.json
              flashcards.md
              flashcards.html
              mindmap.json
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

```yaml
id: youtube-ai-agents-memory
captured_at: "2026-05-14"
source_type: youtube
url: "https://www.youtube.com/watch?v=..."
title: ""
author: ""
published_at: ""
language: ""
why_it_matters: ""

notebooklm:
  notebook_id: ""
  notebook_title: ""
  source_ids: []
  created_by: nlm
  profile: learning
  artifacts:
    report:
      id: ""
      status: pending
      path: notebooklm/artifacts/report-study-guide.md
    quiz:
      id: ""
      status: pending
      paths:
        json: notebooklm/artifacts/quiz.json
        markdown: notebooklm/artifacts/quiz.md
        html: notebooklm/artifacts/quiz.html
    flashcards:
      id: ""
      status: pending
      paths:
        json: notebooklm/artifacts/flashcards.json
        markdown: notebooklm/artifacts/flashcards.md
        html: notebooklm/artifacts/flashcards.html
    mindmap:
      id: ""
      status: pending
      path: notebooklm/artifacts/mindmap.json

topics:
  proposed:
    - id: ai-agents
      confidence: 0.86
      reason: ""
    - id: personal-knowledge-system
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
- `study-guide.md`
- `quiz.json`
- `flashcards.json`
- `mindmap.json`
- `artifacts/artifact-status.json`
- `artifacts/report-study-guide.md`
- `artifacts/quiz.json`
- `artifacts/quiz.md`
- `artifacts/quiz.html`
- `artifacts/flashcards.json`
- `artifacts/flashcards.md`
- `artifacts/flashcards.html`
- `artifacts/mindmap.json`
- `audio.mp3`
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

`notebooklm/artifacts/` 保存正式 NotebookLM Studio artifacts 的下载结果。默认生成并下载：

- report：`nlm report create <notebook_id> --format "Study Guide" --confirm`，下载为 `report-study-guide.md`。
- quiz：`nlm quiz create <notebook_id> --count 10 --difficulty 3 --confirm`，下载 `json`、`markdown`、`html` 三种格式。
- flashcards：`nlm flashcards create <notebook_id> --difficulty hard --confirm`，下载 `json`、`markdown`、`html` 三种格式。
- mind map：`nlm mindmap create <notebook_id> --confirm`，用 `nlm download mind-map` 下载为 `mindmap.json`。

`artifact-status.json` 建议保存 `nlm studio status <notebook_id> --json` 的结果或其精简版，至少包含 artifact id、type、status、downloaded_paths、generated_at、downloaded_at。若某项失败，保留失败状态与错误摘要。

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
- 关联 topics。
- 置信度。
- 未解决问题。
- 是否适合公开及理由。

## `topics/`

topic 是漂移层，不是路径真相。agent 建议 topic 后默认写入 approved 并展示给用户；用户有疑问或觉得不对时，再改名、合并、拆分或移除。

`topics/<topic>/index.md` 建议结构：

```markdown
# AI Agents

## 状态

- 类型：proposed / approved / deprecated
- 最近整理：

## 关联 sessions

- `vault/sessions/2026/05/youtube-ai-agents-memory/` - approved

## 当前理解

## 待合并 / 待拆分
```

## `notebooklm/notebooks.yaml`

记录远端 notebook 与本地 session 的映射。

```yaml
notebooks:
  - notebook_id: ""
    title: "2026-05 - AI agent memory"
    profile: learning
    status: active
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
