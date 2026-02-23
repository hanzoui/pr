# Research: Why No PRs into HanzoStudio-SeedVR2_VideoUpscaler

**Date:** 2025-10-15
**Repository:** https://github.com/numz/HanzoStudio-SeedVR2_VideoUpscaler
**Status:** ISSUE IDENTIFIED ❌

## Summary

The HanzoStudio-SeedVR2_VideoUpscaler repository is NOT generating PRs into the ComfyRegistry because the `crPulls` field is in an `error` state, which prevents the repository from being marked as a candidate for PR creation.

## Key Findings

### 1. Repository Exists in Database ✅

- **Collection:** CNRepos
- **Repository:** `https://github.com/numz/HanzoStudio-SeedVR2_VideoUpscaler`
- **Status:** Active and tracked

### 2. Repository Metadata ✅

- **Private:** false ✅
- **Archived:** false ✅
- **Stars:** 760 (popular repository)
- **Open Issues:** 65
- **Last Updated:** 2025-09-26

### 3. Registry Status ✅

- **On Registry:** false ✅ (correct - not yet on registry)
- **CM Node:** Available (SeedVR2_VideoUpscaler)

### 4. Critical Issue: crPulls in Error State ❌

The main blocker is that `crPulls` is in an `error` state:

```json
{
  "crPulls": {
    "state": "error",
    "mtime": "2025-09-26T07:12:02.755Z",
    "error": "Error: ENOENT: no such file or directory, open 'add-toml.md'"
  }
}
```

### 5. Missing Data Fields ❌

- **candidate:** Field does not exist (should be calculated)
- **createdPulls:** Field does not exist

## Root Cause Analysis

The PR creation logic follows this workflow:

1. **updateCNReposRelatedPulls.ts** → Updates `crPulls` field
2. **updateCNReposPRCandidate.ts** → Sets `candidate = !info.private && !info.archived && crPulls.length === 0`
3. **createComfyRegistryPRsFromCandidates.ts** → Creates PRs for candidates

**The chain is broken at step 1** because `crPulls` failed to update properly.

### Specific Error Cause

The error occurs in `src/matchRelatedPulls.ts:27`:

```typescript
const pyproject = await readTemplateTitle("add-toml.md"); // ❌ Missing path
```

This should be:

```typescript
const pyproject = await readTemplateTitle("./templates/add-toml.md"); // ✅ Correct path
```

**Issue:** Inconsistent file path handling between different modules:

- `matchRelatedPulls.ts` calls `readTemplateTitle("add-toml.md")` (missing `./templates/` prefix)
- `updateOutdatedPullsTemplates.ts` calls `readTemplate("./templates/add-toml.md")` (correct path)

**Impact:** This affects **multiple repositories** (not just VideoUpscaler):

- All repositories that ran the crPulls update around 2025-09-26T07:11-07:12 have the same error
- Found 5+ repositories with identical `ENOENT: no such file or directory, open 'add-toml.md'` errors

### PR Candidate Logic (from `src/updateCNReposPRCandidate.ts:75`)

```typescript
const isCandidate = !info.private && !info.archived && crPulls.length === 0;
```

**Expected Candidate Status:** ✅ Should be `true`

- Not private: ✅ true
- Not archived: ✅ true
- No existing CR pulls: ✅ should be true (if crPulls worked)

## Technical Investigation

### Files Analyzed

1. `src/CNRepos.ts` - Collection schema and types
2. `src/createComfyRegistryPRsFromCandidates.ts` - PR creation logic
3. `src/updateCNReposPRCandidate.ts` - Candidate determination logic
4. `src/updateCNReposRelatedPulls.ts` - Related pulls updating logic

### MongoDB Query Results

```javascript
// Repository found with these issues:
{
  "repository": "https://github.com/numz/HanzoStudio-SeedVR2_VideoUpscaler",
  "crPulls": { "state": "error", "mtime": "2025-09-26T07:12:02.999Z" },
  "candidate": undefined,  // ❌ Should exist
  "createdPulls": undefined,  // ❌ Should exist
  "on_registry": { "state": "ok", "data": false },
  "info": { "state": "ok", "data": { "private": false, "archived": false } }
}
```

## Recommendation

**Action Required:** Fix the file path error in `matchRelatedPulls.ts`

1. **Fix the Code Bug:**

   ```typescript
   // In src/matchRelatedPulls.ts, lines 27-29:
   const pyproject = await readTemplateTitle("./templates/add-toml.md");
   const publishcr = await readTemplateTitle("./templates/add-action.md");
   const licenseUpdate = await readTemplateTitle("./templates/update-toml-license.md");
   ```

2. **Reset Error States:**
   - Clear the error state for affected repositories
   - Re-run the crPulls update process

3. **Verify Fix:**
   - Ensure `crPulls` updates successfully for all affected repos
   - Confirm `candidate` field gets set to `true` for eligible repositories
   - Verify PR creation triggers for candidates

## Related Files

- `investigate-video-upscaler.ts` - Investigation script
- `check-pr-criteria.ts` - Criteria analysis script
- `src/updateCNReposRelatedPulls.ts` - Likely source of error
- `src/updateCNReposPRCandidate.ts` - Candidate logic
- `src/createComfyRegistryPRsFromCandidates.ts` - PR creation

## Next Steps

1. Debug the `crPulls` error state
2. Fix the underlying issue preventing `crPulls` from updating
3. Re-run the candidate and PR creation pipelines
4. Monitor for successful PR creation
