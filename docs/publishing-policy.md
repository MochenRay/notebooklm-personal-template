# Publishing Policy

## 原则

公开内容应是个人理解、结构化重组、短引用和来源链接，不是 NotebookLM 摘要的直接搬运，也不是 YouTube transcript 或文章全文复制。

## 默认行为

NotebookLM Pipeline 默认不生成发布草稿。发布投影必须由用户明确触发，或由后续发布 skill 触发。

NotebookLM notebook link access 是一个例外边界：Pipeline 为了让 Audio Overview artifact link 可播放，会在确认 completed audio 后把 notebook 设为 public link access，并把链接写入私有 `vault/` metadata。这不等于生成公开稿、不等于同步 public template，也不等于发布到个人网站或社媒。

显式发布时可生成：

```text
publish/website.md
publish/metadata.json
publish/social-x.md
publish/social-linkedin.md
```

不自动发布，不 push 到个人网站，不发送社媒。

## 发布候选判断

进入 publish candidate 前，至少满足：

- 对他人有明确帮助。
- 有个人理解、重组或迁移，不只是摘要。
- 能用来源链接和短引用交代出处。
- 不暴露私人上下文、账号、本机路径、内部项目。
- 不违反来源平台和版权边界。

## 网站知识区

个人网站适合：

- 稳定概念卡片。
- 小型知识拓扑。
- 学习路线图。
- 长文复盘。
- 工具/项目方法论。

网站只读 `publish/` 或另行生成的 sanitized public projection，不读 `raw/`、完整 `notebooklm/`、`.viewer-data/` 或私人 `notes/`。

## 社媒草稿

社媒适合：

- 一个强观点。
- 一个反直觉结论。
- 一个可复用框架。
- 一个短线程。

社媒稿必须保留人工确认。若需要多平台发布，先生成平台草稿，不默认调用外部发布 API。

## 版权与引用

- YouTube transcript 不全文公开。
- 长文、论文、付费内容只短引与链接。
- NotebookLM 输出若贴近原文，应二次改写。
- 对外发布时标注原始来源。
- 若来源本身不可公开，publish candidate 应为 false。

## 脱敏检查

发布前检查：

- 无绝对路径，如 `/Users/rayli/...`。
- 无 cookie、token、email、账号信息。
- 无未公开项目细节。
- 无完整 transcript 或大段原文。
- 无误导性归因。
- 无把 agent 推断误写成用户观点。
- 无 NotebookLM notebook id、artifact share URL、本地 vault path 或 private health finding，除非用户明确决定公开且已单独脱敏。
