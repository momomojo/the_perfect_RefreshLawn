/**
 * This script updates all imports from utils/supabase.ts to lib/supabase.ts
 * to fix the multiple GoTrueClient instances issue.
 *
 * Run with: node scripts/update-supabase-imports.js
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Directories to check
const dirsToCheck = ["app", "components", "lib", "utils", "hooks"];

// Regular expressions for finding imports
const importRegex1 = /from\s+['"](.*)\/utils\/supabase['"]/g;
const importRegex2 = /from\s+['"]utils\/supabase['"]/g;

// Find all TypeScript and TypeScript React files
const findFiles = () => {
  try {
    // Use grep to find files with the specific imports
    const grepCommand = `grep -r "from .*utils/supabase" --include="*.tsx" --include="*.ts" ${dirsToCheck.join(
      " "
    )}`;
    const result = execSync(grepCommand, { encoding: "utf-8" });

    // Extract file paths from grep output
    const files = result
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => {
        const colonIndex = line.indexOf(":");
        return line.substring(0, colonIndex);
      })
      .filter((value, index, self) => self.indexOf(value) === index); // Unique values

    return files;
  } catch (error) {
    console.error("Error finding files:", error.message);
    return [];
  }
};

// Update imports in a file
const updateImports = (filePath) => {
  try {
    const content = fs.readFileSync(filePath, "utf-8");

    // Replace imports with different patterns
    let updatedContent = content
      .replace(importRegex1, (match, p1) => {
        const relativePath = calculateRelativePath(filePath, p1);
        return `from "${relativePath}/lib/supabase"`;
      })
      .replace(importRegex2, (match) => {
        const relativePath = calculateRelativePath(filePath);
        return `from "${relativePath}/lib/supabase"`;
      });

    // Only write to the file if changes were made
    if (updatedContent !== content) {
      fs.writeFileSync(filePath, updatedContent, "utf-8");
      console.log(`✅ Updated imports in ${filePath}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
};

// Calculate relative path from file to lib/supabase.ts
const calculateRelativePath = (filePath, prefix = "") => {
  const fileDir = path.dirname(filePath);
  const projectRoot = process.cwd();

  // Get relative path from file to project root
  const relativeToRoot = path.relative(fileDir, projectRoot);

  // Handle root directory case
  if (!relativeToRoot) {
    return ".";
  }

  // Handle nested directory case
  return prefix ? relativeToRoot : relativeToRoot || ".";
};

// Main function
const main = () => {
  console.log("🔍 Finding files with utils/supabase imports...");
  const files = findFiles();

  if (files.length === 0) {
    console.log("✨ No files found that need to be updated.");
    return;
  }

  console.log(`🔄 Found ${files.length} files that need updating:`);
  files.forEach((file) => console.log(`  - ${file}`));

  console.log("\n🛠️ Updating imports...");
  const updatedCount = files.reduce((count, file) => {
    return updateImports(file) ? count + 1 : count;
  }, 0);

  console.log(`\n✅ Updated imports in ${updatedCount} files.`);

  if (updatedCount > 0) {
    console.log(
      "\n🧪 Please test your application thoroughly to ensure everything works correctly."
    );
    console.log(
      '   Check the console for any remaining "Multiple GoTrueClient instances" warnings.'
    );
  }
};

// Run the script
main();
