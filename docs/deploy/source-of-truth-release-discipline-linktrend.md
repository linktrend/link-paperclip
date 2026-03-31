# Source-of-Truth Release Discipline (LiNKpaperclip)

- Deploy only from `origin/master` (or `origin/main` if migration occurs), pinned by tag/SHA.
- No ad-hoc server edits; all changes flow through git history.
- Environment secrets are externalized and never committed.
- Each release stores immutable evidence: git SHA, image digest, deployment timestamp, validation output.
