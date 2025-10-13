#!/usr/bin/env node
/**
 * Cross-platform Supabase control helper.
 * - On Windows with WSL installed: runs Supabase inside the default WSL distro
 *   from the current project directory (converted via wslpath).
 * - On non-Windows: runs Supabase directly.
 *
 * Commands:
 *   auto     (default) Ensure Supabase is running; start if not
 *   start               Start Supabase
 *   stop                Stop Supabase
 *   status              Show status and exit with its code
 *   restart             Stop then start
 */

const { execFileSync, execSync } = require("child_process");
const path = require("path");

function hasWSL() {
  if (process.platform !== "win32") return false;
  try {
    execFileSync("wsl", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function toWSLPath(winPath) {
  try {
    const out = execFileSync("wsl", ["wslpath", "-a", winPath], {
      encoding: "utf8",
    });
    return out.trim();
  } catch (err) {
    // Fallback: naive conversion (D:\foo -> /mnt/d/foo), may break on edge cases
    const driveMatch = /^([A-Za-z]):\\(.*)$/.exec(winPath);
    if (driveMatch) {
      const drive = driveMatch[1].toLowerCase();
      const rest = driveMatch[2].replace(/\\/g, "/");
      return `/mnt/${drive}/${rest}`;
    }
    return winPath;
  }
}

function runInWSL(command, options = {}) {
  const { cwd } = options;
  const wslCwd = cwd ? toWSLPath(cwd) : null;
  const bashCommand = wslCwd ? `cd "${wslCwd}" && ${command}` : command;
  return execFileSync("wsl", ["bash", "-lc", bashCommand], {
    stdio: "inherit",
  });
}

function runLocal(cmd, args = [], options = {}) {
  return execFileSync(cmd, args, { stdio: "inherit", ...options });
}

function getExecutor() {
  const cwd = process.cwd();
  if (hasWSL()) {
    return {
      status() {
        try {
          execFileSync("wsl", [
            "bash",
            "-lc",
            `cd "${toWSLPath(cwd)}" && supabase status > /dev/null 2>&1`,
          ]);
          return 0;
        } catch (e) {
          return e.status || 1;
        }
      },
      start() {
        runInWSL("supabase start", { cwd });
      },
      stop() {
        runInWSL("supabase stop", { cwd });
      },
      statusVerbose() {
        runInWSL("supabase status", { cwd });
      },
    };
  }
  // Non-Windows or Windows without WSL: attempt native CLI
  return {
    status() {
      try {
        execSync("supabase status > /dev/null 2>&1", {
          stdio: "ignore",
          shell: true,
        });
        return 0;
      } catch (e) {
        return e.status || 1;
      }
    },
    start() {
      runLocal("supabase", ["start"]);
    },
    stop() {
      runLocal("supabase", ["stop"]);
    },
    statusVerbose() {
      runLocal("supabase", ["status"]);
    },
  };
}

function printTipAndExit(message, code = 1) {
  console.error(message);
  console.error("\nTip: Install Supabase CLI inside WSL and ensure DNS works.");
  console.error("Once installed, this script will auto-start Supabase on dev.");
  process.exit(code);
}

async function main() {
  const action = (process.argv[2] || "auto").toLowerCase();
  const exe = getExecutor();

  try {
    switch (action) {
      case "auto": {
        const statusCode = exe.status();
        if (statusCode === 0) {
          console.log("Supabase is already running.");
          return;
        }
        console.log("Starting Supabase…");
        exe.start();
        return;
      }
      case "start":
        exe.start();
        return;
      case "stop":
        exe.stop();
        return;
      case "restart":
        try {
          exe.stop();
        } catch {}
        exe.start();
        return;
      case "status": {
        exe.statusVerbose();
        return;
      }
      default:
        console.error(`Unknown action: ${action}`);
        process.exit(2);
    }
  } catch (err) {
    if (
      String(err).includes("ENOENT") ||
      String(err.message || "").includes("ENOENT")
    ) {
      printTipAndExit("Supabase CLI not found.");
    }
    // Re-emit original error with non-zero exit
    process.exit(err.status || 1);
  }
}

main();
