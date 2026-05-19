# Vault

This directory is the local truth layer for NotebookLM learning sessions.

The public template keeps `vault/` empty by default. The private living
instance can add real digest content under:

```text
vault/sessions/YYYY/MM/<session-id>/
vault/topics/<topic-id>/
vault/notebooklm/notebooks.yaml
vault/notebooklm/audio-index.yaml
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
public repository. NotebookLM notebook ids, source ids, artifact share URLs,
`.viewer-data/`, and local health findings also stay out of the public template
unless a separate sanitized projection is explicitly produced.

`vault/notebooklm/audio-index.yaml` is only a backfill queue for old pending
Audio Overview artifacts. The per-session `source.yaml` remains the truth for
that session; the index can be cleared or rebuilt when the vault is reset.
