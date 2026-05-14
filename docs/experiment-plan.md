# 项目汇报与路线图

## 当前结论

本项目已收敛为一条个人学习流水线：

```text
给一个有价值的 YouTube URL
  -> Agent 用 NotebookLM Pipeline 处理
  -> 通过 nlm CLI 创建 NotebookLM notebook
  -> NotebookLM 消化内容
  -> 自动生成并下载正式 NotebookLM Studio artifacts
  -> 本地 vault 保存过程与结果
  -> Agent 提议 topic 聚合
  -> 用户后验拍板
  -> 形成可复用知识卡片
```

核心取舍：

- 入口应是新对话里说“用 NotebookLM Pipeline 处理这个 YouTube URL”，不是每次手动进 NotebookLM 网页建项目。
- NotebookLM 是消化引擎，不是事实层。
- 本地 vault 是事实层。
- `sessions/` 按时间保存稳定学习事件。
- `topics/` 是可漂移的聚合层，由 agent 建议、用户确认。
- 第一阶段采用 `notebooklm-mcp-cli` 的 `nlm` CLI-first，MCP 可选，暂不引入 `notebooklm-py`。
- MVP 一条 source 一个 Notebook，跨 source 聚合放在本地 `topics/`。
- 添加 source 且 ready 后，默认自动生成正式 NotebookLM Studio artifacts：Study Guide report、10 题 quiz、hard flashcards、mind map，并下载到 `notebooklm/artifacts/`。
- 默认不生成 `publish/website.md`；发布投影需明确指令，后续可另抽发布 skill。
- `synthesis.md` 是面向未来复用的知识卡片，不是普通学习笔记。
- 项目准备 Git 化与开源；私人 truth vault、raw 原始材料、媒体 artifact、凭证默认不进 Git。
- 先用 runbook 跑通 3 个样本，再决定是否抽成全局 skill。
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

对齐规则：只要 agent-facing 文档改变了项目目标、阶段、流程、工具取舍或输出结构，必须同步更新本文件。

## 阶段总览

| 阶段 | 目标 | 状态 |
| --- | --- | --- |
| 0. 概念收敛 | 明确 truth layer、CLI-first、topic 漂移层、runbook-first | 已完成 |
| 1. 工具与仓库接入 | 安装并验证 `notebooklm-mcp-cli`、`nlm`、Git 边界、Codex/Gemini 接入 | 已完成：CLI/Codex/Git 已验证，Gemini 按需 |
| 2. 三样本 MVP | 用 3 个 YouTube 验证“URL -> NotebookLM -> 本地知识卡片” | 进行中：样本 1 已完成 |
| 3. Topic 聚合验证 | 验证 agent topic 建议、用户确认、跨月聚合是否可用 | 进行中：样本 1 topics 已确认 |
| 4. Skill 化决策 | 判断是否抽成 `notebooklm-pipeline` skill | 未开始 |
| 5. 发布投影 | 在明确发布指令下，验证个人网站知识区与社媒草稿生成 | 未开始 |
| 6. OpenClaw / Telegram 入口 | 探索 Telegram 发 YouTube URL 后由 OpenClaw 触发 NotebookLM Pipeline | 未来候选 |

## 阶段 0：概念收敛

状态：已完成。

已确认：

- 使用 `nlm` CLI-first，不以 NotebookLM 网页手动流程为主；MCP 可用但不作为第一验收标准。
- 用户最小输入是 YouTube URL + “NotebookLM Pipeline”。
- agent 应自动创建本地 session、调用 NotebookLM、拉回结构化结果。
- 不要求用户一开始定义 topic。
- topic 由 agent 提议，MVP 每次处理结束询问用户确认。
- `sessions/` 是稳定事实层；`topics/` 是漂移索引层。
- MVP 一条 source 一个 Notebook。
- 默认不生成发布草稿，不自动发布。
- `synthesis.md` 采用知识卡片结构。
- 开源项目与私人 truth vault 分层，私人 vault、raw 原始材料、媒体 artifact、凭证默认不进 Git。

已产出：

- `README.md`
- `docs/agent-runbook.md`
- `docs/pipeline.md`
- `docs/vault-schema.md`
- `docs/tool-selection.md`
- `docs/publishing-policy.md`
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
- Git 中只包含项目文档、模板、脚本和可开源代码，不包含私人学习内容。

当前验证记录（2026-05-14）：

- `uv tool install --upgrade notebooklm-mcp-cli` 已完成，安装 `nlm` 与 `notebooklm-mcp`。
- `nlm --version` 返回 `0.6.9`，且提示为 latest version。
- `nlm login --check` 通过，default profile 为 `learning`；账号信息仅作本地验证，不写入项目文档。
- `nlm notebook list` 可列出 notebooks。
- `nlm setup list` 与 `codex mcp list` 均显示 Codex CLI 已启用 `notebooklm-mcp`。
- `nlm doctor` 安装与认证通过，但其 AI Tool Config 检查未识别 Codex；以 `nlm setup list`、`codex mcp list` 与本轮 MCP live list 作为 Codex 接入验证。
- `.gitignore` 已排除私人 vault、raw transcript、媒体 artifact、NotebookLM/browser 凭证与本地运行态。
- GitHub private repo 已创建为 `MochenRay/notebooklm-personal`，本地 `main` 已推送到 `origin`。

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
- `notebooklm/artifacts/` 下的正式 artifacts：report、quiz、flashcards、mind map
- `notes/questions.md`
- 知识卡片式 `synthesis.md`

验收问题：

- 只给 URL 是否足够？
- agent 是否能稳定创建 notebook、添加 source、追问、落盘？
- NotebookLM 对 YouTube 的处理是否可靠？
- 本地文件是否足以让 Codex/Gemini 后续继续理解？
- 单 source 单 notebook 是否造成过多远端 notebook；若造成，作为后续聚合功能处理。

当前验证记录（2026-05-13 PDT）：

- 样本 1 已完成：`How To Completely Reinvent Yourself In 6-12 Months`（Dan Koe）。
- 本地 session：`vault/sessions/2026/05/how-to-completely-reinvent-yourself-6-12-months/`。
- NotebookLM notebook：`dcada0f3-6416-42b7-9281-eda9158e15ef`。
- Source：`86fdbc4c-feca-4785-9660-f2ba8dcb7778`，type=`youtube`，status=`ready`。
- 已产出 `source.yaml`、`notebooklm/report.md`、`notebooklm/topology.md`、`notebooklm/study-guide.md`、`notes/questions.md`、`notes/debate.md`、`synthesis.md`。
- 已补跑正式 NotebookLM Studio artifacts 并下载到 `notebooklm/artifacts/`：report、quiz、flashcards、mind map。
- 用户明确要求不发布，未生成 `publish/website.md` 或公开投影。
- Topics 已由用户批准，并写入 `approved` 与 `vault/topics/<topic>/index.md`。

状态：进行中。样本 1 完成，仍需继续样本 2、样本 3。

## 阶段 3：Topic 聚合验证

目标：验证 topic 不作为目录真相，而作为可漂移索引是否可用。

待做：

- 每个样本由 agent 生成 `topics.proposed`。
- 每个样本结束时询问用户是否确认 proposed topics。
- 用户确认后写入 `topics.approved`。
- 建立或更新 `vault/topics/<topic>/index.md`。
- 验证不同月份、不同 notebook 的相关内容能否被聚合。

验收：

- topic 建议不阻断处理流程。
- topic 错了可以改名、合并、拆分，不需要搬 session 目录。
- agent 能发现“可能复用已有 topic / notebook”的情况并提出建议。

当前验证记录（2026-05-13 PDT）：

- 样本 1 的 proposed topics 已由用户批准：
  - `personal-growth`
  - `identity-reinvention`
  - `behavior-change`
  - `attention-environment-design`
- 已写入 session `source.yaml`、`synthesis.md`、`vault/notebooklm/notebooks.yaml`。
- 已建立 `vault/topics/<topic>/index.md` 的 approved 关联。

状态：进行中。样本 1 topic 确认链路完成；仍需用样本 2、样本 3 验证跨 session 聚合。

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

状态：未开始。

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
- 不自动发布、不自动公开分享 NotebookLM notebook、不删除远端或本地内容。

状态：未来候选。

## 当前下一步

最小下一步是继续阶段 2 的样本 2 与样本 3，并观察已 approved topics 是否能跨 session 复用。
