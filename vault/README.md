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

Do not commit private transcripts, credentials, cookies, or raw media to a
public repository.
