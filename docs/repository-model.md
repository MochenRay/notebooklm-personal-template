# Repository Model

## 目标

本项目采用一套代码、两种仓库投影：

- private living instance：`MochenRay/notebooklm-personal`
- public template：`MochenRay/notebooklm-personal-template`

日常维护只以 private living instance 为完整工作面。public template 是从 private 中筛出的开源安全子集，不是第二套手工维护内容。

## 仓库分工

### Private living instance

用途：真实个人学习系统。

包含：

- 工具代码、Viewer、脚本、模板与文档
- agent-facing Markdown 文档
- 真实 `vault/` digest：sessions、topics、NotebookLM mapping、artifacts、notes、NotebookLM share URL metadata

默认远端：

```text
origin -> https://github.com/MochenRay/notebooklm-personal.git
```

### Public template

用途：可开源的工具模板与空 vault 工作台。

包含：

- `README.md`
- `docs/`
- `templates/`
- `scripts/`
- `src/`
- `package*.json`
- config files
- `vault/README.md`
- `vault/.gitkeep`
- `vault/sessions/.gitkeep`
- `vault/topics/.gitkeep`
- `vault/notebooklm/.gitkeep`
- `vault/notebooklm/audio-index.yaml`（仅空队列或无真实 ID 的示例结构）

不得包含：

- `vault/sessions/**` 的真实 session digest
- `vault/topics/**/index.md` 的真实 topic digest
- `vault/notebooklm/notebooks.yaml`
- 含真实 notebook id、audio artifact id、source id 或 share URL 的 `vault/notebooklm/audio-index.yaml`
- NotebookLM notebook id、source id、artifact share URL 等真实 vault metadata
- `.viewer-data/`
- `raw/`
- credentials、cookies、tokens、local runtime
- `.DS_Store`

默认远端：

```text
public-template -> https://github.com/MochenRay/notebooklm-personal-template.git
```

## Merge 默认规则

以后用户在本项目说“merge”，默认流程是：

```text
1. 先 merge / push 到 private living instance。
2. 审计 public-safe diff。
3. 只把 public-safe 内容同步到 public template。
4. 分别验证 private 与 public remote。
```

不要把当前 `HEAD` 直接推到 public template。`HEAD` 可能含真实 `vault/` digest。

## Public 同步守卫

同步 public template 前，必须先检查：

```bash
git diff --name-only <public-base>..HEAD
```

若出现以下路径，必须排除或停止：

```text
vault/sessions/
vault/topics/*/index.md
vault/notebooklm/notebooks.yaml
.viewer-data/
raw/
.DS_Store
```

若只是工具、Viewer、脚本、模板或文档改动，可同步到 public template。文档中的 schema 示例可以保留空字段，但不能夹带真实 notebook id、source id、share URL 或本地绝对路径。

## 本地 checkout 现状

当前本地可是一份 checkout 挂两个 remotes：

```text
/Users/rayli/My Projects/notebooklm-personal
  origin          private living instance
  public-template public template
```

这不代表两个仓库共用同一真相层。private 是完整 truth，public 是筛选后的 template 投影。

若未来拆成两个本地目录，也必须保持同一语义：

```text
notebooklm-personal/          private living instance
notebooklm-personal-template/ public template
```
