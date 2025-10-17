#!/usr/bin/env node

/**
 * Cross-Platform Development Log Launcher
 *
 * Detects the operating system and launches the appropriate
 * launcher script (PowerShell for Windows, Bash for Unix-like).
 *
 * Usage:
 *   node scripts/logs/launch-dev.js
 *   OR
 *   npm run logs:launch
 */

const { spawn } = require("child_process");
const path = require("path");
const os = require("os");

const platform = os.platform();
const scriptDir = __dirname;

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(" Development Log Launcher");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`\n Detected Platform: ${platform}\n`);

let command, args, options;

if (platform === "win32") {
  // Windows: Launch PowerShell script
  console.log(" Launching Windows PowerShell script...\n");

  const scriptPath = path.join(scriptDir, "launch-dev-windows.ps1");

  command = "powershell.exe";
  args = [
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    scriptPath
  ];
  options = {
    stdio: "inherit",
    cwd: scriptDir
  };
} else {
  // Unix-like (Linux, macOS, WSL): Launch Bash script
  console.log(" Launching Unix/Bash script...\n");

  const scriptPath = path.join(scriptDir, "launch-dev-unix.sh");

  command = "bash";
  args = [scriptPath];
  options = {
    stdio: "inherit",
    cwd: scriptDir
  };
}

// Spawn the appropriate launcher
const child = spawn(command, args, options);

child.on("error", (error) => {
  console.error("\n❌ Error launching script:", error.message);
  console.error("\nTroubleshooting:");

  if (platform === "win32") {
    console.error("  • Ensure PowerShell is available");
    console.error("  • Try running the script manually:");
    console.error("    powershell -File scripts/logs/launch-dev-windows.ps1");
  } else {
    console.error("  • Ensure bash is available");
    console.error("  • Try running the script manually:");
    console.error("    bash scripts/logs/launch-dev-unix.sh");
  }

  process.exit(1);
});

child.on("exit", (code) => {
  if (code !== 0) {
    console.error(`\n❌ Launcher exited with code ${code}`);
    process.exit(code);
  }
});
