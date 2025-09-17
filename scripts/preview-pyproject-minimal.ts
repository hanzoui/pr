#!/usr/bin/env bun
import { mkdir, readFile, rm } from "fs/promises";
import * as os from "os";
import * as path from "path";
import { $ } from "../src/cli/echoBunShell";

/**
 * Minimal script to see what comfy node init generates
 * Usage: bun scripts/preview-pyproject-minimal.ts
 */

async function previewMinimal() {
  const tempDir = path.join(os.tmpdir(), `comfy-pr-minimal-${Date.now()}`);

  try {
    // Create empty directory
    await mkdir(tempDir, { recursive: true });

    console.log("🛠️  Running 'comfy node init' in empty directory...\n");

    // Run comfy node init in empty directory
    await $`cd ${tempDir} && echo N | comfy node init`;

    // Read generated file
    const content = await readFile(`${tempDir}/pyproject.toml`, "utf8");

    console.log("📄 Generated pyproject.toml:\n");
    console.log("=".repeat(60));
    console.log(content);
    console.log("=".repeat(60));

    console.log("\n📝 Notes:");
    console.log("- In actual PR, the description field would be filled from ComfyUI-Manager DB");
    console.log("- The publisher_id would need to be added by the node author");
    console.log("- This file would be added to a 'pyproject' branch\n");
  } catch (error) {
    console.error("❌ Error:", error);
    console.error("\n💡 Make sure comfy-cli is installed: pip install comfy-cli");
  } finally {
    // Cleanup
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

if (import.meta.main) {
  await previewMinimal();
}
