# NotebookLM Personal Learning Assistant

## 当前定位

此项目保存一条个人学习流水线：看到一个有价值的 YouTube 视频后，用 NotebookLM 消化主视频，再用 Web Fast Research 增补相关信源，最后用本地 vault 沉淀为可复用知识卡片。文章、论文、技术资料与发布投影先作为后续扩展，不进入第一阶段 MVP。

本项目的重点不是“管理 NotebookLM 页面”，而是把 NotebookLM 放进 AI vibecoding 工作流。理想入口是：在 Codex/Gemini/Claude 新对话里给一个 YouTube URL，并说“用 NotebookLM Pipeline 处理”，agent 就能按默认流程创建 NotebookLM notebook、导入主 source、抽取研究 query、执行 Web Fast Research，生成并落盘 Study Guide/report、quiz、flashcards、mind map，发起 Audio Overview，最后导出、本地沉淀并生成二次综合。

## 已实现特性

- YouTube URL 直达本地学习单元：agent 新建 session、创建 NotebookLM notebook、导入主视频 source，并把 notebook/source/topic 映射写入本地 vault。
- Source-grounded Web Fast Research：主 source ready 后，先让 NotebookLM 基于 `primary_source_id` 生成 3-5 个英文 research query，再用 `nlm research start --source web --mode fast` 发现候选信源，由 agent 选择性 import 高质量来源，最后基于主视频 + 增补信源一起消化。
- 全量 Studio artifact 默认链路：Study Guide/report、quiz、flashcards、mind map 和 Audio Overview 都是默认要求。前四类 artifact 应在本轮 session 内生成、下载并落到 `notebooklm/artifacts/`；Audio Overview 可以异步完成。
- 可播放音频补档：`npm run share:artifacts -- <session-dir>` 会先确认远端是否存在 `completed` audio。若已完成，脚本把 notebook 设为“知道链接的任何人可访问”，写回 `notebooklm.artifacts.audio.share_url`、`completed_audio_artifacts`、`notebooklm.sharing`，并下载 `notebooklm/artifacts/audio.m4a`；若仍在生成或不存在，只写入“生成中/未完成”状态，不伪造链接。
- 批量音频回填：既有 session 可被批量检查；已完成音频的 session 会写回播放链接并下载音频，未完成或没有 completed audio 的 session 不会被公开。2026-05-19 本地可验证状态为 10 个 session 中 9 个已有 audio share URL，1 个早期样本仅保留旧 artifact 状态快照。
- 媒体二进制不入库：`audio.m4a` 完成后需要落到本地 vault，但 `.m4a` 等媒体文件不进 Git；Git 只保存 metadata、状态和非媒体学习 artifacts。
- 本地 Vault Viewer：`npm run build:data` 从私有 `vault/` 生成 `.viewer-data/` 投影，Vite/React Viewer 提供 overview、sessions、topics、topic detail、session detail、health 与知识图谱阅读面。
- 健康检查与浏览器 smoke：`npm run build:data` 当前写出 10 sessions、23 topics、0 health findings；`npm run smoke` 用 Playwright 验证关键路由、移动端溢出与截图。

## 核心原则

- NotebookLM 是外部消化引擎，不是长期事实层。
- 本地 vault 是事实层，保存来源、NotebookLM 输出、个人理解与二次综合。
- 个人网站和社媒是公开投影层，不属于默认 NotebookLM Pipeline；需要明确发布指令或后续发布 skill。
- MVP 以 `notebooklm-mcp-cli` 的 `nlm` CLI-first 为主；MCP 可用但不作为第一验收标准。
- `notebooklm-py` 暂作第二阶段候选，用于稳定批量导出、Python pipeline、网站 build 数据生成。
- 话题/领域会漂移。文件系统不承载领域真相；`sessions/` 按时间固定保存，`topics/` 做可调整索引。
- topic 由 agent 先建议并默认批准；MVP 每次处理结束必须展示已 approved topics，你若觉得不对再修订。
- Notebook 粒度：MVP 一条主 source 一个 Notebook；Fast Research 增补来源保留在同一个 notebook 内。跨 session、跨课程、跨主题的长期聚合先放在本地 `topics/`，后续再做复用 notebook。
- 添加主 source 且 ready 后，先基于主 source 提取 3-5 个 research query，再用 `nlm research start --source web --mode fast` 找相关信源；默认由 agent 审候选后 import，必要时才用 `--auto-import`。
- 默认正式 Studio artifacts 包含 Study Guide/report、quiz、flashcards、mind map 和 Audio Overview。非音频 artifacts 必须生成并下载落盘；Audio Overview 发起后若尚未完成，可以先记录 `in_progress` / `not_found` / `failed` 与目标路径，未来跑其它 session 时顺手补查，完成后再公开 notebook link access、写回 share URL 并下载 `audio.m4a`。
- 术语边界：用户说“不要视频 / 只要音频”只表示不生成 Video Overview；不能理解为跳过 Study Guide/report、quiz、flashcards、mind map。
- 项目采用 private living instance + public template：私有仓可保存真实 `vault/` digest；公开模板仓只放工具、文档、Viewer 与空 `vault/` 壳。raw transcript、媒体二进制、凭证与本地运行态不进 Git；NotebookLM artifact share URL 可进私有 vault metadata，但不进入公开模板投影。
- `synthesis.md` 应偏未来复用的知识卡片，不是普通观看笔记。
- Viewer 面向阅读默认显示中文标题；`source.yaml` 保留原始 `title`，同时写入 `title_zh`，topic 目录 id 保持稳定英文 slug，`index.md` 一级标题写中文。

## 推荐入口

新对话中最小输入应是：

```text
用 NotebookLM Pipeline 处理这个视频：
<YouTube URL>
```

可选补充：

```text
我关心：<一句话方向>
不要发布，只生成本地沉淀。
```

若你没有想清楚主题、目标、发布形式，agent 应自行推断并提出建议，而不是要求你先完成分类。

## 未来入口候选

后续可探索 `Telegram -> OpenClaw -> NotebookLM Pipeline` 的异步入口：在 Telegram 里发送一个 YouTube URL 给 OpenClaw，由 OpenClaw 触发本项目默认流程，完成 NotebookLM source 导入、本地 vault 沉淀与状态回传。

此能力不进入第一阶段 MVP；实现前需先确认 Telegram bot 权限、OpenClaw job 边界、失败回报、幂等策略、凭证保存位置与隐私边界。

## 项目结构

```text
notebooklm-personal/
  README.md
  package.json
  index.html
  docs/
    agent-runbook.md
    pipeline.md
    tool-selection.md
    vault-schema.md
    experiment-plan.md
    repository-model.md
    publishing-policy.md
  scripts/
    build-viewer-data.mjs
    share-notebook-artifacts.mjs
    smoke-viewer.mjs
  src/
    App.tsx
    data.ts
    router.ts
  templates/
    learning-session.md
    synthesis-card.md
  vault/
    README.md
```

## 文档入口

- 给我看的项目汇报与路线图：`docs/experiment-plan.md`
- 给 agent 执行用的 runbook：`docs/agent-runbook.md`
- 具体流程、结构、工具和发布边界：`docs/pipeline.md`、`docs/vault-schema.md`、`docs/tool-selection.md`、`docs/publishing-policy.md`
- 私有仓 / 公开仓分工与 merge 规则：`docs/repository-model.md`
- Vault Viewer 的历史实施计划：`docs/superpowers/plans/2026-05-16-vault-viewer.md`，当前状态以 README、pipeline 与 schema 文档为准。

若 agent-facing 文档改变了目标、阶段、流程、工具取舍或输出结构，必须同步更新 `docs/experiment-plan.md`，让它保持为最新的人类汇报页。

## Skill 入口

当前已抽出全局 skill：

```text
~/.agents/skills/notebooklm-pipeline/SKILL.md
```

新对话可直接说：

```text
用 NotebookLM Pipeline 处理这个视频：
<YouTube URL>
```

agent 应优先使用 `notebooklm-pipeline` skill；本仓 `docs/agent-runbook.md`、`docs/pipeline.md`、`docs/vault-schema.md` 仍是项目流程的正式文档来源。

## Truth Layers

```text
NotebookLM
  线上消化与生成引擎，可重建，不作唯一事实层

local vault
  私有事实层，保存可追溯学习过程和长期沉淀

topics index
  漂移层，跨时间聚合同领域内容，可重命名、合并、拆分

personal website / social media
  公开投影层，需明确发布指令，不属于默认 NotebookLM Pipeline
```

## Repository Model

本项目采用 private living instance + public template：

- `MochenRay/notebooklm-personal`：私有完整实例，包含真实 `vault/` digest。
- `MochenRay/notebooklm-personal-template`：公开模板仓，包含工具、文档、脚本、Viewer 与空 `vault/` 壳。

以后在本项目说“merge”，默认先进入私有仓，再审计 public-safe diff，并只把安全内容同步到公开模板仓。不要把含真实 `vault/` 的当前 `HEAD` 直接推到 public template。

细则见 `docs/repository-model.md`。

## MVP 成功标准

MVP 已通过；最初用 3 个真实样本验证：

1. 一个技术/认知类 YouTube 视频。
2. 一个课程/访谈类 YouTube 视频。
3. 一个与你现有项目相关的 YouTube 视频。

每个样本应产生：

- 一个本地 session 目录。
- 一个新建 NotebookLM notebook。
- `source.yaml`，含 URL、NotebookLM id、research 记录、artifact 状态、audio share URL 或 pending 状态、proposed/approved topics。
- `notebooklm/` 下的结构化输出。
- `notebooklm/artifacts/` 下的正式 NotebookLM Studio artifacts：`report-study-guide.md`、quiz、flashcards、mind map、`artifact-status.json`，以及音频完成后的 `audio.m4a`。
- `notes/` 下的个人追问和理解。
- 知识卡片式 `synthesis.md`。
- 结束时展示默认 approved topics；若你有疑问或觉得不对，再修订 topic 归属。

## 下一步

阶段 4 已完成并通过 fresh-session smoke；本地 Vault Viewer 已落地；2026-05-19 已完成既有 session 音频分享链接批量回填。下一步可选方向是继续提升 topic 质量、补强音频 pending 回填自动化、做 public-safe projection，或探索 OpenClaw/Telegram 异步入口；发布仍需明确指令，不并入默认 NotebookLM Pipeline。
