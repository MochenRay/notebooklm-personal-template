# 项目汇报与路线图

## 当前结论

本项目已收敛为一条个人学习流水线：

```text
给一个有价值的 YouTube URL
  -> Agent 用 NotebookLM Pipeline 处理
  -> 通过 nlm CLI 创建 NotebookLM notebook
  -> NotebookLM 消化内容
  -> 基于主 source 生成 Web Fast Research queries
  -> 选择性导入相关信源
  -> 生成并落盘 Study Guide/report、quiz、flashcards、mind map
  -> 尝试发起一次 Audio Overview；成功则记录 pending 与 audio-index，受阻则记 health warning
  -> 本地 vault 保存过程与结果
  -> Agent 提议 topic 聚合
  -> 默认 approved 并展示给用户
  -> 形成可复用知识卡片
```

核心取舍：

- 入口应是新对话里说“用 NotebookLM Pipeline 处理这个 YouTube URL”，不是每次手动进 NotebookLM 网页建项目。
- NotebookLM 是消化引擎，不是事实层。
- 本地 vault 是事实层。
- `sessions/` 按时间保存稳定学习事件。
- `topics/` 是可漂移的聚合层，由 agent 建议、默认批准并展示，用户有异议再修订。
- 第一阶段采用 `notebooklm-mcp-cli` 的 `nlm` CLI-first，MCP 可选，暂不引入 `notebooklm-py`。
- MVP 一条主 source 一个 Notebook；同一 notebook 内可由 Web Fast Research 增补相关信源，跨 session 聚合仍放在本地 `topics/`。
- 添加主 source 且 ready 后，默认先基于主 source 生成 research queries，再用 Web Fast Research 选择性导入相关信源。
- 默认生成完整 NotebookLM Studio artifact pack：Study Guide/report、quiz、flashcards、mind map 和 Audio Overview。非音频 artifacts 必须在本轮 session 内下载落盘；Audio Overview 当前 session 只尝试发起一次。若成功返回 artifact id，记录 pending 与 audio-index；若受阻或 rate limited，一次失败即记 `audio_create_blocked` health warning，不反复重试，不写 audio-index。
- `npm run audio:backfill -- --exclude <current-session-dir>` 是音频补档入口：读取 `vault/notebooklm/audio-index.yaml`，只检查已有 audio artifact id 的旧 pending audio。若远端已有 completed audio，底层 `share:artifacts` 才公开 notebook link access，写回 `share_url`、`completed_audio_artifacts`、sharing 状态和 process log；没有 completed audio 时只记录“生成中/未完成”，不公开 notebook、不伪造链接。若 audio create 受阻且没有 artifact id，则不进入 audio-index，只由 health check 暴露。
- 默认不生成 `publish/website.md`；发布投影需明确指令，后续可另抽发布 skill。
- `synthesis.md` 是面向未来复用的知识卡片，不是普通学习笔记。
- 项目采用 private living instance + public template。私有仓包含真实 `vault/`；公开模板仓只包含工具、文档、Viewer 与空 `vault/` 壳。
- Vault Viewer 面向阅读默认显示中文标题：新入库视频必须在 `source.yaml` 写 `title_zh`，topic `index.md` 一级标题使用中文，英文 slug 只作稳定 id。
- 三样本、skill 化与本地 Vault Viewer MVP 已完成；当前 docs 重点是保持 pipeline、schema、viewer、private/public 边界一致。
- 远期可探索 `Telegram -> OpenClaw -> NotebookLM Pipeline` 的异步入口，但不进入 MVP。

## 文档分工

| 文档 | 面向对象 | 作用 |
| --- | --- | --- |
| `docs/experiment-plan.md` | 我 | 项目汇报、阶段拆解、进展总览 |
| `README.md` | 我 + agent | 项目定位与入口 |
| `docs/agent-runbook.md` | agent | 新对话拿到 URL 后如何执行 |
| `docs/pipeline.md` | agent | Pipeline 详细流程 |
| `docs/vault-schema.md` | agent | 本地目录与数据结构 |
| `docs/tool-selection.md` | 我 + agent | 工具取舍 |
| `docs/publishing-policy.md` | agent | 发布、版权、脱敏边界 |
| `docs/repository-model.md` | 我 + agent | 私有仓 / 公开仓分工与 merge 规则 |
| `docs/superpowers/plans/2026-05-16-vault-viewer.md` | agent | Vault Viewer 历史实施计划；已完成，非当前唯一状态页 |

对齐规则：只要 agent-facing 文档改变了项目目标、阶段、流程、工具取舍或输出结构，必须同步更新本文件。

## 阶段总览

| 阶段 | 目标 | 状态 |
| --- | --- | --- |
| 0. 概念收敛 | 明确 truth layer、CLI-first、topic 漂移层、runbook-first | 已完成 |
| 1. 工具与仓库接入 | 安装并验证 `notebooklm-mcp-cli`、`nlm`、Git 边界、Codex/Gemini 接入 | 已完成：CLI/Codex/Git 已验证，Gemini 按需 |
| 2. 三样本 MVP | 用 3 个 YouTube 验证“URL -> NotebookLM -> 本地知识卡片” | 已完成：实跑 4 个 artifact 样本；2026-05-18 起默认流程加入 source-grounded Web Fast Research，仍要求完整 artifact pack 落盘，Audio Overview 支持异步补档 |
| 3. Topic 聚合验证 | 验证 agent topic 建议、默认批准展示、跨月聚合是否可用 | 基础路径已通过；topic 论述合并契约已补强 |
| 4. Skill 化决策 | 判断是否抽成 `notebooklm-pipeline` skill | 已完成：runbook/fallback 已冻结，skill 已安装 |
| 4.5. Vault Viewer 本地工作台 | 让私有 vault 可本地浏览、检索、查 health | 已完成：Vite/React Viewer、`.viewer-data` 投影、10 sessions / 23 topics / 0 health findings |
| 5. 发布投影 | 在明确发布指令下，验证个人网站知识区与社媒草稿生成 | 未开始 |
| 6. OpenClaw / Telegram 入口 | 探索 Telegram 发 YouTube URL 后由 OpenClaw 触发 NotebookLM Pipeline | 未来候选 |

## 阶段 0：概念收敛

状态：已完成。

已确认：

- 使用 `nlm` CLI-first，不以 NotebookLM 网页手动流程为主；MCP 可用但不作为第一验收标准。
- 用户最小输入是 YouTube URL + “NotebookLM Pipeline”。
- agent 应自动创建本地 session、调用 NotebookLM、拉回结构化结果。
- 不要求用户一开始定义 topic。
- topic 由 agent 提议并默认批准；MVP 每次处理结束展示已 approved topics，用户有疑问或觉得不对再修订。
- `sessions/` 是稳定事实层；`topics/` 是漂移索引层。
- MVP 一条主 source 一个 Notebook；research 增补来源保留在同一个 notebook 内，`primary_source_id` 继续指向原 YouTube。
- 默认不生成发布草稿，不自动发布。
- `synthesis.md` 采用知识卡片结构。
- private living instance 与 public template 分层；以后 merge 默认先进入私有仓，再筛选 public-safe 内容同步公开仓。
- Viewer 标题本地化规则已冻结：session 用 `title_zh` 展示，topic 用中文一级标题展示；原始标题和 topic slug 保留为追溯字段。

已产出：

- `README.md`
- `docs/agent-runbook.md`
- `docs/pipeline.md`
- `docs/vault-schema.md`
- `docs/tool-selection.md`
- `docs/publishing-policy.md`
- `docs/repository-model.md`
- `templates/learning-session.md`

## 阶段 1：工具与仓库接入

目标：让 agent 能通过 `nlm` CLI 操作 NotebookLM，并明确开源 repo 与私人 vault 的边界。

已完成：

- 安装 `notebooklm-mcp-cli`。
- 完成 `nlm login --profile learning`。
- 配置 Codex 可调用 `nlm`。
- 跑 `nlm doctor` 与 `nlm notebook list`。

按需扩展：

- 如需 Gemini，再配置 Gemini 可调用 `nlm`。

验收：

- 本机命令行可列出 NotebookLM notebooks。
- Codex 新对话能识别并调用 NotebookLM Pipeline 所需能力。
- 失败时能明确区分认证问题、CLI 问题、NotebookLM source 问题。
- private living instance 可包含真实 `vault/` digest；public template 只包含项目文档、模板、脚本、Viewer 和空 `vault/` 壳，不包含私人学习内容。

当前验证记录（2026-05-14）：

- `uv tool install --upgrade notebooklm-mcp-cli` 已完成，安装 `nlm` 与 `notebooklm-mcp`。
- `nlm --version` 返回 `0.6.9`，且提示为 latest version。
- `nlm login --check` 通过，default profile 为 `learning`；账号信息仅作本地验证，不写入项目文档。
- `nlm notebook list` 可列出 notebooks。
- `nlm setup list` 与 `codex mcp list` 均显示 Codex CLI 已启用 `notebooklm-mcp`。
- `nlm doctor` 安装与认证通过，但其 AI Tool Config 检查未识别 Codex；以 `nlm setup list`、`codex mcp list` 与本轮 MCP live list 作为 Codex 接入验证。
- `.gitignore` 已排除 `.viewer-data`、raw transcript、媒体 artifact、NotebookLM/browser 凭证与本地运行态；真实 `vault/` digest 只属于 private living instance，不能同步到 public template。
- GitHub private repo 已创建为 `MochenRay/notebooklm-personal`，本地 `main` 已推送到 `origin`。

当前 live smoke（2026-05-19）：

- `nlm --version` 返回 `0.6.9`。
- `nlm login --check` 对 `learning` profile 通过。
- `nlm notebook list --profile learning --json` 可列出 24 个 NotebookLM notebooks。
- `npm run build:data` 通过，写出 10 sessions、23 topics、0 health findings。

状态：已完成。Gemini 接入为按需扩展，未纳入第一验收阻塞。

## 阶段 2：三样本 MVP

目标：用真实 YouTube 内容验证流程是否成立。

样本：

1. 技术/认知类 YouTube 视频。
2. 课程/访谈类 YouTube 视频。
3. 与现有项目相关的 YouTube 视频。

每个样本应产出：

- `vault/sessions/YYYY/MM/<slug>/source.yaml`
- `notes/process-log.md`
- `notebooklm/report.md` 或 `notebooklm/topology.md`
- `notebooklm/artifacts/` 下的正式 artifacts：Study Guide/report、quiz、flashcards、mind map、artifact status，以及 Audio Overview 的 pending 状态或旧补档后的 share URL metadata
- `notes/questions.md`
- 知识卡片式 `synthesis.md`

验收问题：

- 只给 URL 是否足够？
- agent 是否能稳定创建 notebook、添加 source、追问、落盘？
- NotebookLM 对 YouTube 的处理是否可靠？
- 本地文件是否足以让 Codex/Gemini 后续继续理解？
- 单 source 单 notebook 是否造成过多远端 notebook；若造成，作为后续聚合功能处理。

当前验证记录（2026-05-14）：

- 样本 1 已完成并补齐最新 schema：`How To Completely Reinvent Yourself In 6-12 Months`（Dan Koe）。
  - Session：`vault/sessions/2026/05/how-to-completely-reinvent-yourself-6-12-months/`
  - Notebook：`<private-id>`
  - Source：`<private-id>`
  - 2026-05-14 已把早期 list-style `artifacts` schema 迁到当前 keyed schema，并补齐 `report-study-guide.md`、`quiz.html`、`flashcards.html`、`mindmap.json`、`artifact-status.json`。
- 样本 2 已完成：`How To Build A $1M One-Person Business Faster With AI`（Dan Koe）。
  - Session：`vault/sessions/2026/05/how-to-build-a-1m-one-person-business-faster-with-ai/`
  - Notebook：`<private-id>`
  - Source：`<private-id>`
- 样本 3 已完成：`翁家翌：OpenAI，GPT，强化学习，Infra，后训练，天授，tuixue，开源，CMU，清华｜WhynotTV Podcast #4`。
  - Session：`vault/sessions/2026/05/weng-jiayi-openai-gpt-rl-infra-post-training/`
  - Notebook：`<private-id>`
  - Source：`<private-id>`
- 样本 4 已完成：`Yao Shunyu: Let Me Go a Little Crazy! Training Models at Anthropic & Gemini, Heroism Is Over`。
  - Session：`vault/sessions/2026/05/yao-shunyu-training-models-anthropic-gemini-heroism-is-over/`
  - Notebook：`<private-id>`
  - Primary source：`<private-id>`
  - Extra source：`<private-id>`
- 4 个样本均已产出 `source.yaml`、`notes/process-log.md`、`notebooklm/report.md`、`notebooklm/topology.md`、`notebooklm/artifacts/`、`notes/questions.md`、`notes/debate.md`、`notes/my-notes.md`、`synthesis.md`。
- 4 个样本均未生成 `publish/website.md` 或公开投影。

样本 4 的具体情况：

- 最初目标仍是一条 source 一个 notebook。
- 第一次添加 source 用的是 `nlm source add ... --youtube <url>`。CLI 返回 `Error: Could not add url source.`，按失败处理。
- 随后用 fallback：`nlm source add ... --url <url>`，成功创建 ready source `<private-id>`。
- 后续 report、quiz、flashcards、mind map 都用 `--source-ids <private-id>` 显式绑定 primary source，所以样本产物有效。
- 远端检查发现第一次失败的 `--youtube` 尝试仍留下一个 URL 标题的额外 source：`<private-id>`。这不是本地 schema 错误，而是一次远端半成功残留。
- 2026-05-14 复盘后修订 runbook：以后同一次运行中若第一次 add-source 失败、fallback 成功，且能明确识别失败尝试留下的非 primary source，agent 应自动删除该残留，不再要求用户确认，也不在最终回复中暴露为待处理事项；其它 source/notebook 删除仍需明确确认。样本 4 的既有历史残留不被本次文档修订自动删除。

状态：已完成。三样本目标已满足，且实跑第 4 个样本暴露并验证了 source add 失败后的 fallback 与记录机制。

2026-05-18 流程改造：

- 默认流程不是删减为单音频流程，而是在原有学习 artifact pack 前增加 source-grounded Web Fast Research。
- 复盘口径已修正：“不需要视频，只要音频”只表示不生成 Video Overview，不表示把默认流程改成单音频流程。
- 新默认为：主 YouTube source -> 主 source 生成 research queries -> Web Fast Research -> 选择性 import -> 全部 sources 综合 -> Study Guide/report、quiz、flashcards、mind map 落盘 -> Audio Overview 尝试发起一次；成功则记录 pending/audio-index，受阻则写 health warning -> 本地 vault 沉淀。下一次新 session 开始前再补查旧 pending audio。
- `source.yaml` 新增 `notebooklm.research`，用于记录 seed queries、research tasks、import policy、imported sources 和最终用于综合与 artifacts 的 selected source ids。
- Viewer 对 quiz、flashcards、mind map 的读取继续是默认能力；新 session 不应因为 audio 未完成而缺少练习与 mind map artifacts。

2026-05-19 音频分享与下载回填：

- 新增并加固 `scripts/share-notebook-artifacts.mjs` 与 `npm run share:artifacts -- <session-dir>`。
- 脚本会先读取 `nlm studio status --json`，只有存在 `completed` audio 时才执行 `nlm share public`，避免把未完成或 failed audio 的 notebook 误公开。
- 脚本写回 `notebooklm.sharing`、`notebooklm.artifacts.audio.share_url`、`completed_audio_artifacts` 和 `notebooklm/artifacts/artifact-status.json`，并向 `notes/process-log.md` 追加审计记录；不下载本地音频二进制。
- 若 audio 仍在生成、失败或不存在，脚本只写回 checked 状态，不公开 notebook、不伪造链接；后续跑其它 session 时可再次检查并补档。
- 兼容旧的 array 形态 `artifact-status.json`，写回时统一为带 `sharing` 与 `artifacts` 的对象形态。
- 已批量检查 10 个既有 session；当前本地可验证结果为 9 个 session 有 completed audio 并写回分享链接。`how-to-completely-reinvent-yourself-6-12-months` 是早期旧 artifact 样本，本地 `artifact-status.json` 仅记录 infographic、flashcards、quiz、report、mind_map 等 completed artifact，未记录 completed audio，因此未写 `share_url`。

## 阶段 3：Topic 聚合验证

目标：验证 topic 不作为目录真相，而作为可漂移索引是否可用。

待做：

- 每个样本由 agent 生成 `topics.proposed`。
- 每个样本默认把 proposed topic id 写入 `topics.approved`。
- 每个样本结束时向用户展示 approved topics；用户有疑问或觉得不对，再修订。
- 建立或更新 `vault/topics/<topic>/index.md`。
- 验证不同月份、不同 notebook 的相关内容能否被聚合。

验收：

- topic 建议不阻断处理流程。
- topic 错了可以改名、合并、拆分，不需要搬 session 目录。
- topic 不再等待用户逐项确认；默认批准，靠展示后的异议修订收敛。
- agent 能发现“可能复用已有 topic / notebook”的情况并提出建议。

当前验证记录（2026-05-14）：

- 早期 4 个 MVP 样本均已写入 `topics.proposed` 与 `topics.approved`。
- 早期 4 个 MVP 样本均已更新 `vault/notebooklm/notebooks.yaml` 与 `vault/topics/<topic>/index.md`。
- 已出现跨 session 复用：
  - `ai-workflow-design` 已关联 5 个 session。
  - `frontier-ai-model-training`、`post-training-rl`、`agentic-coding`、`ai-research-organization` 均关联 2 个 session。
- topic 作为漂移索引的路线成立：session 目录未随 topic 变化移动，跨样本聚合由 `topics/` 承担。
- 2026-05-14 复查发现：早期 `topics/<topic>/index.md` 容易把 `## 当前理解` 写成按 session 追加的记录，例如“新 session 补充”“某某访谈进一步强调”。这不适合作为长期 topic 浏览层。
- 已补强 contract：topic index 的 `## 当前理解` 必须做 semantic merge，按核心命题、共识、分歧、边界和可迁移原则组织；`## 关联 sessions` 只保留溯源，不承担正文论述。

状态：基础路径已通过；topic 论述质量已发现并修正一处 contract 缺口。后续若要判完全成熟，还需专门演练 topic 改名、合并、拆分、删除，以及多 session 语义重写的稳定性。

## 阶段 4：Skill 化决策

目标：决定是否把 runbook 提升成全局 skill。

触发条件：

- 三个样本跑通。
- 执行步骤基本稳定。
- 失败 fallback 清晰。
- topic 建议机制可用。
- 输出结构不再大改。

可能产物：

```text
~/.agents/skills/notebooklm-pipeline/SKILL.md
```

验收：

- 新对话只需说“用 NotebookLM Pipeline 处理这个 YouTube URL”。
- Codex、Gemini、Claude 都能按同一规则执行。

当前验证记录（2026-05-14）：

- 已冻结当前 runbook、schema、样本 4 source fallback 规则与样本 1 schema backfill 结果。
- `docs/agent-runbook.md`、`docs/pipeline.md`、`docs/vault-schema.md` 已补齐：
  - `primary_source_id`
  - `source_note`
  - `cleanup.auto_deleted_failed_source_ids`
  - `cleanup.unresolved_source_ids`
  - generic `--url` fallback
  - `--source-ids <primary_source_id>` artifact/query 约束
  - `origin: notebooklm-with-agent-edit` provenance 规则
  - 失败 add-source 残留 source 的自动清理规则，以及其它 source/notebook 删除仍需确认的边界
- 已创建全局 skill：
  - `~/.agents/skills/notebooklm-pipeline/SKILL.md`
- 已完成 skill 验收：
  - `uv run --with pyyaml python .../quick_validate.py ~/.agents/skills/notebooklm-pipeline` 通过。
  - `~/.claude/skills/notebooklm-pipeline` 已同步为指向 `~/.agents/skills/notebooklm-pipeline` 的 mirror。
  - `npx --yes skills ls -g --json` 可发现 `notebooklm-pipeline`。
- `notebooklm-pipeline` 与 `nlm-skill` 分工已明确：
  - `nlm-skill` 是 NotebookLM CLI/MCP 工具手册。
  - `notebooklm-pipeline` 是本项目学习流水线入口。
- fresh-session smoke 已通过：
  - Session：`vault/sessions/2026/05/im-begging-you-to-start-writing-essays-even-if-you-hate-writing/`
  - Notebook：`<private-id>`
  - Source：`<private-id>`
  - 远端 source count 为 1，无 cleanup candidate。
  - report、quiz、flashcards、mind map 均 completed，且本地 artifact 文件存在、非空、JSON/YAML 可解析。
  - 已修正该 session 的 `language: "en"`，并把经 agent 整理的 `report.md` / `topology.md` 标为 `origin: notebooklm-with-agent-edit`。

状态：已完成。skill 入口已通过新 YouTube 样本验证。

## 阶段 4.5：Vault Viewer 本地工作台

目标：让私有 vault 不只是一组 Markdown/YAML 文件，而能作为本地只读知识工作台浏览。

当前实现：

- `scripts/build-viewer-data.mjs` 读取 `vault/`，生成 `.viewer-data/sessions.json`、`.viewer-data/topics.json`、`.viewer-data/health.json`。
- Vite/React app 提供 overview、sessions、session detail、topics、topic detail、health、知识图谱与练习 artifact 阅读。
- `scripts/smoke-viewer.mjs` 会启动本地 dev server，用 Playwright 检查关键路由、移动端横向溢出、frontmatter 隐藏和截图。
- `.viewer-data/` 是本地投影，不是事实层；不进入 public template，也不替代 `vault/`。

当前验证记录（2026-05-19）：

- `npm run build:data` 通过：10 sessions、23 topics、0 health findings。
- `git ls-files` 未包含 `.viewer-data/`、`.m4a`、`raw/` 或 `.DS_Store`。
- 公开部署仍不是默认动作；若需要上线，应走 sanitized public projection，而不是直接暴露完整 `.viewer-data` 或 `vault/`。

状态：本地 MVP 已完成，后续可继续做 public-safe projection、lazy-loading 或 topic 质量提升。

## 阶段 5：发布投影

目标：在用户明确要求发布时，把高价值学习结果投影到个人网站或社媒草稿。

待做：

- 明确个人网站知识区的数据格式。
- 验证显式发布指令下生成 `publish/website.md` 是否足够。
- 生成社媒草稿模板。
- 建立发布前脱敏检查。
- 判断是否需要另抽 `notebooklm-publish` 或类似发布 skill。

边界：

- 不自动发布。
- 不公开完整 transcript。
- 不把 NotebookLM 摘要原样搬运成公开内容。
- 不暴露本机路径、账号、内部项目。

状态：未开始。

## 阶段 6：OpenClaw / Telegram 入口

目标：探索一个异步入口，让用户在 Telegram 里发送 YouTube URL 给 OpenClaw，由 OpenClaw 触发本项目默认流程，完成 NotebookLM 处理、本地 vault 沉淀和状态回传。

候选流程：

```text
Telegram message with YouTube URL
  -> Telegram bot / webhook
  -> OpenClaw job
  -> NotebookLM Pipeline
  -> local vault session
  -> Telegram status/result reply
```

待确认：

- Telegram bot 与 OpenClaw 的认证、权限和回调方式。
- OpenClaw job 的幂等键、队列状态、失败重试和日志位置。
- `nlm` profile、NotebookLM auth 与本地 vault 写入的运行边界。
- Telegram 回复只回状态、摘要、文件路径还是可下载 artifact。
- 私人 URL、账号、NotebookLM notebook id、raw transcript 与媒体 artifact 的隐私边界。

边界：

- 不进入第一阶段 MVP。
- 不阻塞三样本验证、topic 聚合与 skill 化决策。
- 不自动发布网站/社媒；NotebookLM notebook link access 只在旧 pending audio 被后续补档确认为 completed 后默认公开，用于让 artifact share URL 可播放。同一次运行中失败 add-source 尝试留下、fallback 成功后可明确识别的非 primary source 残留，仍按 pipeline 规则自动清理。

状态：未来候选。

## 当前下一步

最小下一步不再是继续跑样本。当前收口选择：

1. 继续提升 topic 质量：按 `## 列表摘要`、`## 当前理解` 和 health signal 修 topic 层。
2. 若要公开展示，先做 sanitized public projection，不直接部署私有 `.viewer-data` 或 `vault/`。
3. 若要异步入口，再冻结 Telegram/OpenClaw 权限、幂等、失败回报与隐私合同。
