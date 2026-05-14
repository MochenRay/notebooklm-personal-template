# Tool Selection

## 当前结论

MVP 走 `notebooklm-mcp-cli` 的 `nlm` CLI-first 路线。原因是本项目的核心体验是 AI vibecoding：用户在 Codex/Gemini/Claude 新对话里给 YouTube URL，agent 通过 CLI 调 NotebookLM 完成消化与本地沉淀。

MCP server 可配置、可辅助，但不作为第一验收标准。第一阶段先证明 CLI 路径稳定。

`notebooklm-py` 暂不作为第一阶段必需工具。它更适合后续稳定导出、Python pipeline、批量处理与网站 build。

## `jacob-bd/notebooklm-mcp-cli`

角色：控制面。

能力：

- CLI：`nlm`
- MCP server：`notebooklm-mcp`
- 创建/list/get/rename/delete NotebookLM notebook
- 添加 URL/text/file/Drive source
- query notebook
- 生成 studio artifact
- download artifact
- research、batch、cross-notebook、pipeline、tag
- 配置 Codex、Gemini、Claude Code、Cursor 等 AI 工具

适合 MVP：

- 新对话可由 agent 直接驱动。
- NotebookLM 网站会自然出现新 notebook，但不是用户手动创建。
- 本地 session 与远端 notebook 可同步建立映射。
- CLI 路径更容易记录命令、失败和 fallback。

风险：

- 使用非官方内部 API，Google 可随时变更。
- 需要管理 `nlm login`、profile、cookie 生命周期。
- 删除、公开分享、邀请协作者等动作必须人工确认。
- 长任务需等待与轮询，不可假定即时完成。

## `teng-lin/notebooklm-py`

角色：导出与脚本化底层库。

适合第二阶段：

- 批量下载 report、quiz、flashcards、mind map、slides、audio/video。
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

## 本地检索与知识图谱

第三阶段再考虑：

- Markdown/Obsidian vault
- BM25/vector/hybrid search
- local vault MCP
- topic topology generator

此层用于让 agent 跨 session 找到旧知识，不是 MVP 前置条件。

## Skill 策略

先写 runbook，后抽 skill。

判断是否该抽 `notebooklm-pipeline` skill：

- 已跑 3 个样本。
- 触发语稳定。
- `nlm`/MCP 成功路径与失败 fallback 清楚。
- topic 建议与用户确认机制跑通。
- 输出文件结构没有大改。

若成立，安装到：

```text
~/.agents/skills/notebooklm-pipeline/SKILL.md
```

这样 Codex、Gemini、Claude 可共享同一技能入口。

发布到个人网站或社媒不并入 `notebooklm-pipeline`。后续若需要，另抽发布 skill，例如 `notebooklm-publish`。
