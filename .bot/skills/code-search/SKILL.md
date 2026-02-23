---
name: Hanzo Studio Code Search
description: Search code across Hanzo Studio repositories using comfy-codesearch service. Including all hanzoui repos and Community made Custom Node Repos on GitHub.
---

# Hanzo Studio Code Search

Search for code patterns, functions, and implementations:
prbot code search --query "<search terms>"

NOTE: Does NOT support --limit parameter. Results are automatically paginated.

Examples:
prbot code search --query "binarization" --repo hanzoui/studio
prbot code search --query "authentication function"
prbot code search --query "video transcription whisper"

Best practices:

- Use specific function names or patterns for better results.
- Specify repo when you know which repository to search.
- Review results and cite file paths and line numbers.
