---
name: notion-search
description: Search Notion documentation and knowledge base from the hanzoui team workspace. Use when the user needs to find internal documentation, guides, meeting notes, or reference materials stored in Notion.
allowed-tools: Bash
model: haiku
---

# Notion Documentation Search

This skill searches the hanzoui team Notion workspace for documentation, guides, and internal knowledge.

## Usage

```bash
prbot notion search -q "<SEARCH_TERMS>" [-l <NUMBER>]
```

## Parameters

- `-q, --query` (required): Search terms to find in Notion pages
- `-l, --limit` (optional): Maximum number of results to return (default: 10)

## Output Format

Returns results with:

- **Title**: Page title
- **URL**: Direct link to Notion page
- **Last edited**: When the page was last modified
- **Page ID**: Unique identifier

## Examples

```bash
# Search for Hanzo Studio setup documentation
prbot notion search -q "Hanzo Studio setup" -l 5

# Find meeting notes
prbot notion search -q "weekly sync meeting"

# Search for API references
prbot notion search -q "API documentation workflow" -l 3
```

## Notes

- Requires Notion API integration token in environment variables
- Searches across all accessible pages in the hanzoui workspace
- Returns most recently edited pages first
- Useful for finding internal documentation not in public docs
