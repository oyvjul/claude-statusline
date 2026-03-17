import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const REPO_DIR = path.dirname(fileURLToPath(import.meta.url));
const CLAUDE_DIR = path.join(os.homedir(), ".claude");
const FILES = ["statusline-command.js"];
const OLD_FILES = ["statusline-command.sh"];

// Ensure ~/.claude/ exists
fs.mkdirSync(CLAUDE_DIR, { recursive: true, mode: 0o700 });

for (const file of FILES) {
  const src = path.join(REPO_DIR, ".claude", file);
  const dest = path.join(CLAUDE_DIR, file);

  if (!fs.existsSync(src)) {
    console.error(`ERROR: Source file not found: ${src}`);
    process.exit(1);
  }

  // Check if dest already exists
  let destStat;
  try {
    destStat = fs.lstatSync(dest);
  } catch {
    destStat = null;
  }

  if (destStat) {
    if (destStat.isSymbolicLink()) {
      const existing = fs.readlinkSync(dest);
      if (existing === src) {
        console.log(`Already linked: ${file}`);
        continue;
      }
      console.log(`Replacing symlink: ${dest} (was -> ${existing})`);
      fs.unlinkSync(dest);
    } else {
      const bakDest = `${dest}.bak`;
      if (fs.existsSync(bakDest)) {
        console.warn(`WARNING: overwriting existing backup ${bakDest}`);
      }
      console.log(`Backing up existing ${dest} -> ${bakDest}`);
      fs.renameSync(dest, bakDest);
    }
  }

  fs.symlinkSync(src, dest);
  console.log(`Linked: ${dest} -> ${src}`);
}

// Cleanup old .sh symlinks if they point into this repo
for (const oldFile of OLD_FILES) {
  const oldDest = path.join(CLAUDE_DIR, oldFile);
  try {
    const st = fs.lstatSync(oldDest);
    if (st.isSymbolicLink()) {
      const target = fs.readlinkSync(oldDest);
      if (target.startsWith(path.join(REPO_DIR, ".claude"))) {
        fs.unlinkSync(oldDest);
        console.log(`Removed old symlink: ${oldDest}`);
      }
    }
  } catch {
    /* doesn't exist, ignore */
  }
}

// Ensure settings.json has the statusLine config
const settingsPath = path.join(CLAUDE_DIR, "settings.json");
const statusLineConfig = {
  type: "command",
  command: `node ${CLAUDE_DIR}/statusline-command.js`,
};

let settings = {};
if (fs.existsSync(settingsPath)) {
  try {
    const raw = fs.readFileSync(settingsPath, "utf8");
    settings = JSON.parse(raw);
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

// Migrate from old bash command to new node command
if (settings.statusLine) {
  const cmd = settings.statusLine.command || "";
  if (cmd.includes("statusline-command.sh")) {
    settings.statusLine = statusLineConfig;
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
    console.log("Migrated statusLine command from .sh to .js in settings.json");
  } else {
    console.log("statusLine already configured in settings.json");
  }
} else {
  settings.statusLine = statusLineConfig;
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
  console.log(
    fs.existsSync(settingsPath)
      ? "Added statusLine config to settings.json"
      : "Created settings.json with statusLine config",
  );
}

console.log("\nDone! Claude statusline is installed.");
console.log("Restart Claude Code to see the status line.");
