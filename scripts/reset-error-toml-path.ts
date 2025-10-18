#!/usr/bin/env bun

import { CNRepos } from "../src/CNRepos";
import { db } from "../src/db";

/**
 * Reset script for add-toml.md path error states
 *
 * This script resets error states for repositories that failed due to the
 * missing "./templates/" prefix in matchRelatedPulls.ts file paths.
 *
 * Target error: "Error: ENOENT: no such file or directory, open 'add-toml.md'"
 */

async function resetErrorTomlPath() {
  console.log("🔧 Starting reset of add-toml.md error states...\n");

  // Find all repositories with the specific add-toml.md error
  const errorFilter = {
    "crPulls.error": { $regex: "ENOENT.*open 'add-toml\\.md'" },
    "crPulls.state": "error",
  };

  console.log("🔍 Finding affected repositories...");
  const affectedRepos = await CNRepos.find(errorFilter).toArray();
  console.log(`Found ${affectedRepos.length} repositories with add-toml.md errors`);

  if (affectedRepos.length === 0) {
    console.log("✅ No repositories found with add-toml.md errors. Nothing to reset.");
    await db.close();
    return;
  }

  // Show sample of what will be reset
  console.log("\n📋 Sample repositories to be reset:");
  affectedRepos.slice(0, 5).forEach((repo, idx) => {
    console.log(`${idx + 1}. ${repo.repository}`);
    console.log(`   Error: ${repo.crPulls?.error}`);
    console.log(`   Time: ${repo.crPulls?.mtime}`);
  });

  // Confirm before proceeding
  console.log(`\n⚠️  About to reset crPulls state for ${affectedRepos.length} repositories`);
  console.log("This will:");
  console.log("- Remove the error state from crPulls field");
  console.log("- Remove the error message");
  console.log("- Reset mtime to allow re-processing");
  console.log("- Keep all other repository data intact");

  // In production, you might want to add a confirmation prompt here
  // For now, proceeding automatically since this is a targeted fix

  console.log("\n🔄 Resetting error states...");

  // Reset the crPulls field to remove error state
  // We'll unset the crPulls field entirely to force re-processing
  const updateResult = await CNRepos.updateMany(errorFilter, {
    $unset: {
      crPulls: 1,
    },
  });

  console.log(`✅ Reset completed!`);
  console.log(`📊 Update results:`);
  console.log(`  - Matched documents: ${updateResult.matchedCount}`);
  console.log(`  - Modified documents: ${updateResult.modifiedCount}`);
  console.log(`  - Acknowledged: ${updateResult.acknowledged}`);

  // Verify the reset worked
  console.log("\n🔍 Verifying reset...");
  const remainingErrors = await CNRepos.countDocuments(errorFilter);
  console.log(`Remaining add-toml.md errors: ${remainingErrors}`);

  if (remainingErrors === 0) {
    console.log("✅ All add-toml.md errors successfully reset!");
  } else {
    console.log("⚠️  Some errors may still remain. Check manually.");
  }

  // Show repositories that are now ready for re-processing
  const readyForReprocessing = await CNRepos.countDocuments({
    repository: { $in: affectedRepos.map((r) => r.repository) },
    crPulls: { $exists: false },
  });

  console.log(`📈 Repositories ready for crPulls re-processing: ${readyForReprocessing}`);

  console.log("\n🚀 Next steps:");
  console.log("1. Run updateCNReposRelatedPulls to populate crPulls data");
  console.log("2. Run updateCNReposPRCandidate to identify candidates");
  console.log("3. Run createComfyRegistryPRsFromCandidates to create PRs");

  await db.close();
}

if (import.meta.main) {
  await resetErrorTomlPath();
}
