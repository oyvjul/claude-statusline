import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const REPO_DIR = path.dirname(fileURLToPath(import.meta.url));
const CLAUDE_DIR = path.join(os.homedir(), ".claude");
const ENTRY_POINT = path.join(REPO_DIR, ".claude", "statusline-command.js");
// Ensure ~/.claude/ exists
fs.mkdirSync(CLAUDE_DIR, { recursive: true, mode: 0o700 });

// Ensure settings.json has the statusLine config pointing directly to repo
const settingsPath = path.join(CLAUDE_DIR, "settings.json");
const expectedCommand = `node ${ENTRY_POINT}`;
const statusLineConfig = { type: "command", command: expectedCommand };

let settings = {};
if (fs.existsSync(settingsPath)) {
  try {
    settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
  } catch (e) {
    if (e instanceof SyntaxError) {
      const backupPath = `${settingsPath}.bak`;
      fs.copyFileSync(settingsPath, backupPath);
      console.warn(
        `WARNING: settings.json has invalid JSON (${e.message}). Backed up to ${backupPath}`,
      );
    }
    settings = {};
  }
}

if (settings.statusLine?.command === expectedCommand) {
  console.log("statusLine already configured in settings.json");
} else {
  settings.statusLine = statusLineConfig;
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
  console.log("Updated statusLine config in settings.json");
}

console.log("\nDone! Claude statusline is installed.");
console.log("Restart Claude Code to see the status line.");
