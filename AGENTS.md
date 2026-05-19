# Codex 共享入口

本文件是 Codex 本地入口的薄适配层。

最小冷启动只读：

1. `/Users/rayli/AI-Shared/README.md`
2. `/Users/rayli/AI-Shared/agents/codex.md`

仅在以下情况追加读取：

- 需要写回共享层，或边界不清：`/Users/rayli/AI-Shared/rules/policy.md`
- 需要项目延续：相关 `projects/<name>/project.md` 和 `handover.md`
- 需要稳定用户画像：相关 `profile/*` 或 `projects/UserSelfExploration/*`

项目内追加规则：

- 凡涉及本项目 `merge`、`push`、GitHub remote、公开仓同步或 `public-template`，必须先读 `docs/repository-model.md`。
- 本项目默认是 private living instance + public template：`origin` 是私有完整实例，`public-template` 是公开模板投影。
- 用户在本项目说“merge”，默认先进入私有仓，再审计 public-safe diff，只把安全内容同步公开仓。
- 不要把含真实 `vault/` digest 的当前 `HEAD` 直接推到 `public-template`。

说明：

- `~/.codex` 继续保存 Codex 自身原始会话、缓存和运行态。
- 不把 `~/.codex/history.jsonl`、`sessions/`、`archived_sessions/`、sqlite 文件当作共享记忆。
- 如果本地 `rules`、`projects`、`memory` 或本地投影副本出现长期知识增量，先登记 `/Users/rayli/AI-Shared/handoff/sync-queue.md`，再判断是否回写共享层；运行态和临时产物不要同步。
