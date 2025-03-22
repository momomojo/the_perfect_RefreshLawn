const fs = require("fs");
const path = require("path");

// Directories to check
const dirsToCheck = ["app", "components", "lib", "utils", "hooks"];

// Counter for modified files
let filesFound = 0;
let filesUpdated = 0;
let incorrectPathsFound = 0;

console.log("🔍 Finding files with Supabase imports...\n");

// Process each directory
dirsToCheck.forEach((dir) => {
  if (!fs.existsSync(dir)) return;

  // Find all TypeScript and TypeScript React files recursively
  function processDirectory(currentPath) {
    const files = fs.readdirSync(currentPath);

    files.forEach((file) => {
      const filePath = path.join(currentPath, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        processDirectory(filePath);
      } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
        let content = fs.readFileSync(filePath, "utf-8");

        // Check for various incorrect Supabase import patterns
        const incorrectImportPattern =
          /(from\s+['"])((?:\.\.\/)+)lib\/supabase(['"]\s*;?)/g;
        const utilsImportPattern =
          /(from\s+['"](?:\.\.\/)*?)utils\/supabase(['"]\s*;?)/g;

        // Count incorrect paths (like too many ../ in path)
        let match;
        while ((match = incorrectImportPattern.exec(content)) !== null) {
          const relativePath = match[2];

          // Calculate the correct relative path
          const correctPath = calculateRelativePath(
            path.dirname(filePath),
            path.join(process.cwd(), "lib")
          );
          if (relativePath !== correctPath && !correctPath.includes("utils")) {
            incorrectPathsFound++;
            console.log(`  Found incorrect path in: ${filePath}`);
            console.log(
              `    Current: ${match[1]}${relativePath}lib/supabase${match[3]}`
            );
            console.log(
              `    Should be: ${match[1]}${correctPath}lib/supabase${match[3]}\n`
            );
          }
        }

        // Check for utils/supabase imports
        if (content.includes("utils/supabase")) {
          filesFound++;
          console.log(`  Found utils/supabase import in: ${filePath}`);

          // Calculate relative path to lib
          const relativePath = calculateRelativePath(
            path.dirname(filePath),
            process.cwd()
          );

          // Replace utils/supabase with lib/supabase
          const newContent = content.replace(
            utilsImportPattern,
            `$1${relativePath}/lib/supabase$2`
          );

          // Only write if changes were made
          if (newContent !== content) {
            filesUpdated++;
            fs.writeFileSync(filePath, newContent);
            console.log(`  ✅ Updated imports in: ${filePath}\n`);
          }
        }

        // Fix incorrect lib/supabase paths
        let fixedContent = content;
        const dirDepth = path
          .relative(process.cwd(), path.dirname(filePath))
          .split(path.sep)
          .filter(Boolean).length;
        const correctRelativePath = calculateRelativePath(
          path.dirname(filePath),
          path.join(process.cwd(), "lib")
        );

        // Create regex that matches lib/supabase imports with potentially incorrect relative paths
        const anyLibImportPattern = new RegExp(
          `(from\\s+['"])((?:\\.\\.\\/)+)lib\\/supabase(['"]\\s*;?)`,
          "g"
        );

        let contentChanged = false;
        fixedContent = fixedContent.replace(
          anyLibImportPattern,
          (match, prefix, relativePath, suffix) => {
            if (relativePath !== correctRelativePath) {
              contentChanged = true;
              return `${prefix}${correctRelativePath}lib/supabase${suffix}`;
            }
            return match;
          }
        );

        if (contentChanged) {
          fs.writeFileSync(filePath, fixedContent);
          console.log(`  ✅ Fixed incorrect lib path in: ${filePath}\n`);
          filesUpdated++;
        }
      }
    });
  }

  processDirectory(dir);
});

// Calculate the relative path from sourcePath to targetPath
function calculateRelativePath(sourcePath, targetPath) {
  let relativePath = path.relative(sourcePath, targetPath);

  // Handle case where paths are the same directory
  if (relativePath === "") {
    return "./";
  }

  // Convert backslashes to forward slashes for consistency
  relativePath = relativePath.split(path.sep).join("/");

  // Add trailing slash
  if (!relativePath.endsWith("/")) {
    relativePath += "/";
  }

  // Make sure it starts with ./ or ../
  if (!relativePath.startsWith("./") && !relativePath.startsWith("../")) {
    relativePath = "./" + relativePath;
  }

  return relativePath;
}

// Summary
if (filesFound === 0 && incorrectPathsFound === 0) {
  console.log("✨ No files found that need to be updated.");
} else {
  console.log(`\n📝 Summary:`);
  console.log(`  • Found ${filesFound} files with utils/supabase imports`);
  console.log(
    `  • Found ${incorrectPathsFound} files with incorrect lib/supabase paths`
  );
  console.log(`  • Updated ${filesUpdated} files\n`);
  console.log("Next steps:");
  console.log(
    "1. Clear your browser storage (Application > Storage > Clear Site Data)"
  );
  console.log("2. For web: Close all browser tabs with your app");
  console.log("3. Restart your development server: npx expo start --clear");
  console.log("4. Test the logout functionality\n");

  if (filesUpdated > 0) {
    console.log(
      "🔧 Imports have been fixed! Your app should now use a single Supabase client."
    );
  }
}
