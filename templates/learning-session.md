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

默认策略：生成并落盘 Study Guide/report、quiz、flashcards、mind map，并发起 Audio Overview。Audio Overview 对当前 session 只记录 pending 与 `audio-index`；后续新 session 开始时才批量补查旧 pending，completed 后只写 share URL，本地不保存音频二进制。

“不要视频 / 只要音频”只表示不生成 Video Overview，不影响 Study Guide/report、quiz、flashcards、mind map。

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
- Selected source IDs for artifacts：

非音频 artifacts 生成与下载：

- [ ] `nlm report create --profile learning <notebook_id> --format "Study Guide" --source-ids <selected_source_ids> --confirm`
- [ ] `nlm quiz create --profile learning <notebook_id> --count 10 --difficulty 3 --source-ids <selected_source_ids> --confirm`
- [ ] `nlm flashcards create --profile learning <notebook_id> --difficulty hard --source-ids <selected_source_ids> --confirm`
- [ ] `nlm mindmap create --profile learning <notebook_id> --title "Mind Map" --source-ids <selected_source_ids> --confirm`
- [ ] `nlm studio status --profile learning <notebook_id> --json`
- [ ] `nlm download report <notebook_id> --id <report_artifact_id> --output ".../notebooklm/artifacts/report-study-guide.md"`
- [ ] `nlm download quiz <notebook_id> --id <quiz_artifact_id> --format json --output ".../notebooklm/artifacts/quiz.json"`
- [ ] `nlm download quiz <notebook_id> --id <quiz_artifact_id> --format markdown --output ".../notebooklm/artifacts/quiz.md"`
- [ ] `nlm download quiz <notebook_id> --id <quiz_artifact_id> --format html --output ".../notebooklm/artifacts/quiz.html"`
- [ ] `nlm download flashcards <notebook_id> --id <flashcards_artifact_id> --format json --output ".../notebooklm/artifacts/flashcards.json"`
- [ ] `nlm download flashcards <notebook_id> --id <flashcards_artifact_id> --format markdown --output ".../notebooklm/artifacts/flashcards.md"`
- [ ] `nlm download flashcards <notebook_id> --id <flashcards_artifact_id> --format html --output ".../notebooklm/artifacts/flashcards.html"`
- [ ] `nlm download mind-map <notebook_id> --id <mindmap_artifact_id> --output ".../notebooklm/artifacts/mindmap.json"`
- [ ] 更新 `source.yaml` 中 `notebooklm.artifacts.report/quiz/flashcards/mindmap`

Audio Overview：

- [ ] `nlm audio create --profile learning <notebook_id> --format deep_dive --length default --source-ids <selected_source_ids> --confirm`

状态与分享：

- [ ] 写 `source.yaml` 的 `notebooklm.artifacts.audio.status`
- [ ] 写或更新 `vault/notebooklm/audio-index.yaml`
- [ ] `notebooklm/artifacts/artifact-status.json`
- [ ] `notebooklm.artifacts.audio.status` 为 `requested` / `in_progress`
- [ ] 当前 session 不等待 completed，不写 `share_url`

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
