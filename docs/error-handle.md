# Error Handling Documentation

## File Path Resolution Bug - Template Files

**Date:** 2025-10-15
**Severity:** Critical
**Status:** Fixed

### Summary

A file path resolution bug in `src/matchRelatedPulls.ts` caused widespread failures in the PR creation pipeline due to missing `./templates/` path prefix when reading template files.

### Root Cause

**Issue:** Inconsistent file path handling between modules

- `matchRelatedPulls.ts` used: `readTemplateTitle("add-toml.md")`
- Other modules used: `readTemplate("./templates/add-toml.md")`

**Error Pattern:** `ENOENT: no such file or directory, open 'add-toml.md'`

### Impact

- **Scope:** System-wide failure affecting all repositories
- **Count:** 3,660 repositories with error state
- **Effect:** Complete breakdown of PR creation pipeline
- **Timeline:** Errors occurred during batch processing runs

### Fix Applied

**Code Fix:** Updated `src/matchRelatedPulls.ts` lines 27-29:

```typescript
// Before (broken):
const pyproject = await readTemplateTitle("add-toml.md");
const publishcr = await readTemplateTitle("add-action.md");
const licenseUpdate = await readTemplateTitle("update-toml-license.md");

// After (fixed):
const pyproject = await readTemplateTitle("./templates/add-toml.md");
const publishcr = await readTemplateTitle("./templates/add-action.md");
const licenseUpdate = await readTemplateTitle("./templates/update-toml-license.md");
```

**Database Reset:** Created `scripts/reset-error-toml-path.ts` to:

- Target specific error pattern
- Reset error states for affected repositories
- Force re-processing of failed operations
- Provide verification and logging

### Resolution Steps

1. **Code Fix:** Added missing `./templates/` prefix to file paths
2. **State Reset:** Ran reset script to clear error states
3. **Verification:** Confirmed 0 remaining errors after reset
4. **Pipeline Restart:** Ready for re-processing of affected repositories

### Prevention

- **Consistency:** Ensure all template file paths use the same format
- **Testing:** Test file path resolution in different execution contexts
- **Documentation:** Document expected file structure and path conventions

### Files Modified

- `src/matchRelatedPulls.ts` - Fixed file paths
- `scripts/reset-error-toml-path.ts` - Reset script (created)
- `docs/error-handle.md` - This documentation

### Monitoring

Monitor for similar patterns:

- File path resolution errors
- Template loading failures
- Batch processing failures affecting multiple repositories

### Recovery Process

For similar issues:

1. Identify the specific error pattern
2. Fix the root cause in code
3. Create targeted reset script
4. Verify fix and reset effectiveness
5. Restart affected pipelines
