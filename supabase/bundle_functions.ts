// supabase/bundle_functions.ts
import { bundle } from "https://deno.land/x/emit@0.31.1/mod.ts";
import { ensureDir } from "https://deno.land/std@0.208.0/fs/ensure_dir.ts"; // Helper to create directories

const functionsToBundle = [
  "stripe-payment-api",
  "stripe-customer-api",
  "stripe-subscription-api",
  "stripe-admin-api",
  "stripe-refund",
  // Add other functions that use the 'shared' directory here
];

const sourceBaseDir = "./functions"; // Relative to supabase directory where script is run
const outputBaseDir = "./functions_bundled"; // Temporary directory for bundled output

console.log(`Starting function bundling...`);
console.log(`Source directory: ${sourceBaseDir}`);
console.log(`Output directory: ${outputBaseDir}`);

await ensureDir(outputBaseDir); // Make sure base output directory exists

for (const funcName of functionsToBundle) {
  const entryPoint = `${sourceBaseDir}/${funcName}/index.ts`;
  const funcOutputDir = `${outputBaseDir}/${funcName}`;
  const outFile = `${funcOutputDir}/index.js`; // Output as index.js inside the dir

  console.log(`Bundling ${funcName}...`);
  try {
    await ensureDir(funcOutputDir); // Ensure function-specific output dir exists

    // Check if entry point exists
    try {
      await Deno.stat(entryPoint);
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        console.warn(`  -> Entry point not found: ${entryPoint}. Skipping.`);
        continue; // Skip this function if entry point doesn't exist
      } else {
        throw error; // Re-throw other errors
      }
    }

    // Using deno_emit's bundle function
    const { code } = await bundle(entryPoint, {
      // Add any specific Deno bundle options here if needed
      // E.g., importMap: "./import_map.json"
    });

    await Deno.writeTextFile(outFile, code);
    console.log(`  -> Bundled successfully to ${outFile}`);
  } catch (error) {
    console.error(`  -> Error bundling ${funcName}:`, error);
  }
}

console.log("Function bundling complete.");
