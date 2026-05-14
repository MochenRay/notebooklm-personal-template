# NotebookLM Personal Learning Assistant

## 当前定位

此项目保存一条个人学习流水线：看到一个有价值的 YouTube 视频后，用 NotebookLM 消化，用本地 vault 沉淀为可复用知识卡片。文章、论文、技术资料与发布投影先作为后续扩展，不进入第一阶段 MVP。

本项目的重点不是“管理 NotebookLM 页面”，而是把 NotebookLM 放进 AI vibecoding 工作流。理想入口是：在 Codex/Gemini/Claude 新对话里给一个 YouTube URL，并说“用 NotebookLM Pipeline 处理”，agent 就能按默认流程创建 NotebookLM notebook、导入 source、追问、导出、落本地、生成二次综合。

## 核心原则

- NotebookLM 是外部消化引擎，不是长期事实层。
- 本地 vault 是事实层，保存来源、NotebookLM 输出、个人理解与二次综合。
- 个人网站和社媒是公开投影层，不属于默认 NotebookLM Pipeline；需要明确发布指令或后续发布 skill。
- MVP 以 `notebooklm-mcp-cli` 的 `nlm` CLI-first 为主；MCP 可用但不作为第一验收标准。
- `notebooklm-py` 暂作第二阶段候选，用于稳定批量导出、Python pipeline、网站 build 数据生成。
- 话题/领域会漂移。文件系统不承载领域真相；`sessions/` 按时间固定保存，`topics/` 做可调整索引。
- topic 由 agent 先建议，你拍板；MVP 每次处理结束必须请你确认 proposed topics。
- Notebook 粒度：MVP 一条 source 一个 Notebook。跨 source、跨课程、跨主题的聚合先放在本地 `topics/`，后续再做复用 notebook。
- 项目本身准备 Git 化与开源；私人 truth vault、raw transcript、媒体 artifact、凭证与本地运行态默认不进 Git。
- `synthesis.md` 应偏未来复用的知识卡片，不是普通观看笔记。

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
  docs/
    agent-runbook.md
    pipeline.md
    tool-selection.md
    vault-schema.md
    experiment-plan.md
  templates/
    learning-session.md
    synthesis-card.md
```

## 文档入口

- 给我看的项目汇报与路线图：`docs/experiment-plan.md`
- 给 agent 执行用的 runbook：`docs/agent-runbook.md`
- 具体流程、结构、工具和发布边界：`docs/pipeline.md`、`docs/vault-schema.md`、`docs/tool-selection.md`、`docs/publishing-policy.md`

若 agent-facing 文档改变了目标、阶段、流程、工具取舍或输出结构，必须同步更新 `docs/experiment-plan.md`，让它保持为最新的人类汇报页。

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

## MVP 成功标准

先用 3 个真实样本验证：

1. 一个技术/认知类 YouTube 视频。
2. 一个课程/访谈类 YouTube 视频。
3. 一个与你现有项目相关的 YouTube 视频。

每个样本应产生：

- 一个本地 session 目录。
- 一个新建 NotebookLM notebook。
- `source.yaml`，含 URL、NotebookLM id、proposed topics。
- `notebooklm/` 下的结构化输出。
- `notes/` 下的个人追问和理解。
- 知识卡片式 `synthesis.md`。
- 结束时向你询问 proposed topics 是否确认。

## 下一步

先不要直接抽全局 skill。先按 `docs/agent-runbook.md` 跑 3 个样本。若流程稳定，再把 runbook 提升为 `~/.agents/skills/notebooklm-pipeline/SKILL.md`，供 Codex、Gemini、Claude 共用。
