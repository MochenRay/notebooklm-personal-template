# Learning Session Template

## 基本信息

- Session ID：
- Source URL：
- Source type：
- 原始标题：
- 中文标题：
- 作者/频道：
- 捕获日期：
- 为什么值得处理：

## NotebookLM

- Profile：
- Notebook ID：
- Notebook title：
- Notebook 中文标题：
- Source IDs：
- Primary source ID：
- Source anomaly / cleanup log：
- Auto-deleted failed source IDs：
- 状态：

## Studio Artifacts

默认策略：只生成 Audio Overview；不默认生成 video、report、quiz、flashcards、mind map。

## Research

Query 生成：

- [ ] `nlm notebook query --profile learning <notebook_id> --source-ids <primary_source_id> "<research query prompt>"`

Fast Research：

- [ ] `nlm research start "<query>" --profile learning --notebook-id <notebook_id> --source web --mode fast`
- [ ] `nlm research status --profile learning <notebook_id> --full`
- [ ] `nlm research import --profile learning <notebook_id> <task_id> --indices <indices>`

记录：

- Seed queries：
- Research task IDs：
- Import policy：
- Imported source IDs：
- Selected source IDs for audio：

生成命令：

- [ ] `nlm audio create --profile learning <notebook_id> --format deep_dive --length default --source-ids <selected_source_ids> --confirm`

状态与下载：

- [ ] `nlm studio status <notebook_id> --json`
- [ ] `notebooklm/artifacts/artifact-status.json`
- [ ] `notebooklm/artifacts/audio.m4a`

## Topics

### Proposed

| Topic ID | 中文标题 | Confidence | Reason |
| --- | --- | --- | --- |
| | | | |

### Approved

- 默认同 Proposed；处理结束时展示给用户，用户有异议再修订。

## NotebookLM 输出

- [ ] `notebooklm/report.md`
- [ ] `notebooklm/topology.md`
- [ ] 其他：

## 核心理解

一句话结论：

关键概念：

结构拓扑：

可迁移观点：

## 我的思考

我同意：

我怀疑：

我想继续追问：

可迁移到我的项目/方法论：

## 二次综合

知识卡片路径：

- `synthesis.md`

本内容对我的长期知识系统有什么增量：

## 发布判断

- Publish candidate：
- 是否需要另行调用发布 skill：
- 适合社媒：
- 版权/隐私风险：
- 需要人工确认：
