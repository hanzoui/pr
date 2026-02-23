---
name: hanzoui Repo Reading (Read-Only)
description: Clone and inspect hanzoui repositories for analysis and citations (no direct pushing).
---

# hanzoui Repo Reading (Read-Only)

Clone repositories locally for analysis (read-only):
mkdir -p ./codes/hanzoui
git clone --depth=1 https://github.com/hanzoui/<repo>.git ./codes/hanzoui/<repo>
cd ./codes/hanzoui/<repo> && git checkout <branch>

Or use prbot code search for faster results:
prbot code search --query "<search terms>" --repo hanzoui/<repo>

Guidelines:

- Use code search first for specific queries.
- Clone only when you need to browse full repository structure.
- Do not commit/push directly; use the PR bot for changes.
- When citing code, include file paths and line spans where helpful.
