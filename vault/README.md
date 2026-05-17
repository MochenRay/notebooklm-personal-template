# Vault

This directory is the local truth layer for NotebookLM learning sessions.

The open-source template keeps `vault/` empty by default. A private living
instance can add real digest content under:

```text
vault/sessions/YYYY/MM/<session-id>/
vault/topics/<topic-id>/
vault/notebooklm/notebooks.yaml
```

The viewer and build scripts are designed to work with both states:

- empty vault: show setup / empty-state screens
- populated vault: generate `.viewer-data/` and render the local knowledge workbench

## Topic index contract

Each `vault/topics/<topic-id>/index.md` should keep `## 列表摘要` in sync with
`## 当前理解`. The list summary is a short, rephrased display summary for the
topic list; do not copy a raw source paragraph or session title list into it.
When a new session creates or updates a topic, update this summary together
with the topic body.

Do not commit private transcripts, credentials, cookies, or raw media to a
public repository.
