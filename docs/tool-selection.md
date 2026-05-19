# Tool Selection

## 当前结论

MVP 走 `notebooklm-mcp-cli` 的 `nlm` CLI-first 路线。原因是本项目的核心体验是 AI vibecoding：用户在 Codex/Gemini/Claude 新对话里给 YouTube URL，agent 通过 CLI 调 NotebookLM 完成消化与本地沉淀。

MCP server 可配置、可辅助，但不作为第一验收标准。第一阶段已证明 CLI 路径稳定；后续仍以 live smoke 验证认证是否过期。

当前默认流程已把 Web Fast Research 与完整 Studio artifact pack 纳入 CLI-first 主路径：添加主 source 且 ready 后，先基于主 source 生成 research queries，再用 `nlm research start --source web --mode fast` 发现并选择性导入相关来源，随后生成并下载 Study Guide/report、quiz、flashcards、mind map，并发起 Audio Overview。Audio create 命令显式传 `--language zh-CN` 生成中文音频；当前 session 只记录 pending 与 `audio-index`；后续补档发现 completed 后才公开 notebook link access 并保存可播放 artifact share URL，不下载本地音频二进制。video、slides、infographic 不默认生成。

项目脚本层目前有两个音频补档入口：`npm run audio:backfill -- --exclude <current-session-dir>` 读取 `vault/notebooklm/audio-index.yaml` 批量检查旧 pending，`npm run share:artifacts -- <session-dir>` 负责单条旧 session 在 completed 后公开 notebook 并写 share URL。Web Fast Research 与非音频 artifacts 的生成/下载不是单独脚本，而是 pipeline/runbook/skill 的默认执行步骤，底层仍通过 `nlm research start/status/import`、`nlm report/quiz/flashcards/mindmap create` 与 `nlm download ...` 完成。

`notebooklm-py` 暂不作为第一阶段必需工具。它更适合后续稳定导出、Python pipeline、批量处理与网站 build。

## `jacob-bd/notebooklm-mcp-cli`

角色：控制面。

能力：

- CLI：`nlm`
- MCP server：`notebooklm-mcp`
- 创建/list/get/rename/delete NotebookLM notebook
- 添加 URL/text/file/Drive source
- Web/Drive research source discovery
- query notebook
- 生成 studio artifact
- download artifact
- research、batch、cross-notebook、pipeline、tag
- share public/private/status，用于生成可访问的 NotebookLM artifact 链接
- 配置 Codex、Gemini、Claude Code、Cursor 等 AI 工具

适合 MVP：

- 新对话可由 agent 直接驱动。
- NotebookLM 网站会自然出现新 notebook，但不是用户手动创建。
- 本地 session 与远端 notebook 可同步建立映射。
- CLI 路径更容易记录命令、失败和 fallback。

风险：

- 使用非官方内部 API，Google 可随时变更。
- 需要管理 `nlm login`、profile、cookie 生命周期。
- 删除、邀请协作者等动作必须人工确认；NotebookLM notebook link access 只在 audio completed 后由 Pipeline 默认公开，用于让 artifact share URL 可播放。同一次运行中失败 add-source 尝试留下、fallback 成功后可明确识别为非 primary 的 source 残留，是 NotebookLM Pipeline 的预授权自动清理例外。
- 长任务需等待与轮询，不可假定即时完成。
- `share:artifacts` 必须先确认 audio completed，再公开 notebook 并写 share URL；失败或未完成 audio 不公开、不写播放链接，只写 pending/failed 状态。

## `teng-lin/notebooklm-py`

角色：导出与脚本化底层库。

适合第二阶段：

- 批量导出 report、quiz、flashcards、mind map、slides、video，或未来明确需要本地媒体归档时再评估。
- 更复杂的批量导出；当前 artifact pack 与音频补档已由 `nlm` + `audio:backfill` / `share:artifacts` 覆盖，不需要为此提前引入。
- 写 Python pipeline。
- 为个人网站生成稳定 Markdown/JSON 数据。
- 定期刷新多个 notebooks。

暂缓原因：

- 与 `notebooklm-mcp-cli` 的默认认证目录不同，并用会增加复杂度。
- 第一阶段先验证流程价值，不先扩大维护面。

## YouTube transcript MCP

角色：fallback。

可选工具：

- TubeMCP
- `kimtaeyoon83/mcp-server-youtube-transcript`

何时需要：

- NotebookLM 无法导入 YouTube。
- 视频无 captions 或 captions 语言不合适。
- 需要本地 transcript 快照。

MVP 不默认引入。

## `prantikmedhi/lore`

角色：参考实现。

它接近本项目想法：source -> NotebookLM -> report/study pack/mind map/handoff bundle。但当前不作为主依赖，先观察成熟度与维护稳定性。

## 本地 Viewer、检索与知识图谱

当前已实现：

- `scripts/build-viewer-data.mjs`：从私有 `vault/` 生成 `.viewer-data/sessions.json`、`.viewer-data/topics.json`、`.viewer-data/health.json`。
- Vite/React Viewer：overview、sessions、session detail、topics、topic detail、health、知识图谱和 practice artifact 阅读。
- `scripts/smoke-viewer.mjs`：用 Playwright 做本地浏览器 smoke。

后续再考虑 BM25/vector/hybrid search、local vault MCP 或更正式的 topic topology generator。`.viewer-data` 是本地投影，不是事实层，也不是 public template 内容。

## Skill 策略

先写 runbook，后抽 skill。当前判断：阶段 4 已可执行，`notebooklm-pipeline` 与通用 `nlm-skill` 分工如下：

- `nlm-skill`：NotebookLM CLI/MCP 的通用工具手册。
- `notebooklm-pipeline`：本项目的个人学习流水线，负责 `YouTube URL -> NotebookLM -> local vault -> synthesis -> topics`。

判断是否该抽 `notebooklm-pipeline` skill：

- 已跑 3 个样本。
- 触发语稳定。
- `nlm`/MCP 成功路径与失败 fallback 清楚。
- topic 建议、默认批准展示与异议修订机制跑通。
- 输出文件结构没有大改。

条件已成立，安装到：

```text
~/.agents/skills/notebooklm-pipeline/SKILL.md
```

这样 Codex、Gemini、Claude 可共享同一技能入口。

发布到个人网站或社媒不并入 `notebooklm-pipeline`。后续若需要，另抽发布 skill，例如 `notebooklm-publish`。
