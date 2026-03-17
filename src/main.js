import os from "node:os";
import { ansi, RESET } from "./ansi.js";
import { renderCommitBar } from "./render.js";
import { fetchUsage, debugLog } from "./usage.js";
import { getGitInfo } from "./git.js";
import { formatReset } from "./format.js";

// --- Security ---
process.umask(0o077);

// --- Color palette ---
const C_MODEL = ansi(100, 180, 255); // sky blue
const C_CTX = ansi(140, 210, 245); // ice cyan
const C_REPO = ansi(80, 155, 225); // medium blue
const C_DIR = ansi(100, 120, 155); // slate
const C_PIPE = ansi(60, 75, 100); // dark blue-gray
const C_CURRENT = ansi(70, 185, 225); // cyan-blue
const C_WEEKLY = ansi(120, 160, 210); // steel blue
const C_PCT = ansi(200, 215, 240); // ice white
const C_RESET_TIME = ansi(90, 105, 130); // muted slate

// COMMIT gradient (deep blue -> light cyan)
const COMMIT_GRADIENT = [
  [60, 120, 200],
  [80, 145, 215],
  [100, 165, 230],
  [120, 185, 240],
  [140, 200, 245],
  [160, 215, 250],
];

const PIPE = ` ${C_PIPE}|${RESET} `;

async function main() {
  // Read stdin
  let input = "";
  if (!process.stdin.isTTY) {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    input = Buffer.concat(chunks).toString("utf8");
  }

  let data = {};
  try {
    data = JSON.parse(input);
  } catch {
    /* empty or invalid */
  }

  // Fetch usage (async) + git info (sync) in parallel
  const usagePromise = fetchUsage();

  const cwd = data.workspace?.current_dir || data.cwd || process.cwd();
  const gitInfo = getGitInfo(cwd);
  const usage = await usagePromise;

  // --- Model name ---
  const displayName = data.model?.display_name || "";
  const modelId = data.model?.id || "";
  const verMatch = modelId.match(/(\d+)-(\d+)(?:-\d+)?$/);
  const ver = verMatch ? `${verMatch[1]}.${verMatch[2]}` : "";
  const modelVersion =
    displayName && ver ? `${displayName} ${ver}` : displayName || "";

  // COMMIT gradient
  const commitLetters = "COMMIT";
  let commitGradient = "";
  for (let i = 0; i < commitLetters.length; i++) {
    const [r, g, b] = COMMIT_GRADIENT[i];
    commitGradient += `\x1b[1;38;2;${r};${g};${b}m${commitLetters[i]}`;
  }
  commitGradient += RESET;

  const modelPart = modelVersion ? `${C_MODEL}${modelVersion}${RESET}` : "";

  // --- Context percentage ---
  const usedPct = data.context_window?.used_percentage;
  const usedInt = usedPct != null ? Math.round(usedPct) : 0;
  const contextPart = `\u270d\ufe0f ${C_CTX}${usedInt}%${RESET}`;

  // --- Git part ---
  let gitPart = "";
  let displayDir = "";
  if (gitInfo) {
    if (gitInfo.branch) {
      gitPart = `${C_REPO}${gitInfo.branch}${gitInfo.dirty}${RESET}${PIPE}${C_DIR}${gitInfo.repoName}${RESET}`;
    } else {
      gitPart = `${C_REPO}${gitInfo.repoName}${RESET}`;
    }
    const relDir = cwd.startsWith(gitInfo.gitRoot)
      ? cwd.slice(gitInfo.gitRoot.length)
      : "";
    displayDir = relDir || ".";
    if (displayDir !== ".") displayDir = "." + relDir;
  } else {
    displayDir = cwd.startsWith(os.homedir())
      ? "~" + cwd.slice(os.homedir().length)
      : cwd;
  }
  const dirPart = `${C_DIR}${displayDir}${RESET}`;

  // --- Usage bars ---
  const fiveHourPct = usage?.five_hour?.utilization;
  const fiveHourReset = usage?.five_hour?.resets_at;
  const sevenDayPct = usage?.seven_day?.utilization;
  const sevenDayReset = usage?.seven_day?.resets_at;

  const fiveHourInt = fiveHourPct != null ? Math.round(fiveHourPct) : 0;
  const sevenDayInt = sevenDayPct != null ? Math.round(sevenDayPct) : 0;

  const fiveHourPadded = String(fiveHourInt).padStart(3, " ");
  const sevenDayPadded = String(sevenDayInt).padStart(3, " ");

  const sessionBar = `${C_CURRENT}current${RESET} ${renderCommitBar(fiveHourInt, "COMMIT", [30, 110, 170])} ${C_PCT}${fiveHourPadded}%${RESET}`;
  const weeklyBar = `${C_WEEKLY}weekly${RESET}  ${renderCommitBar(sevenDayInt, "COMMIT", [25, 65, 130])} ${C_PCT}${sevenDayPadded}%${RESET}`;

  const sessionResetFmt = formatReset(fiveHourReset);
  const sessionResetPart = sessionResetFmt
    ? `  ${C_RESET_TIME}${sessionResetFmt}${RESET}`
    : "";
  const weeklyResetFmt = formatReset(sevenDayReset);
  const weeklyResetPart = weeklyResetFmt
    ? `  ${C_RESET_TIME}${weeklyResetFmt}${RESET}`
    : "";

  // --- Assemble Line 1 ---
  let line1 = `${commitGradient} ${C_PIPE}\u00b7${RESET} `;
  if (modelPart) line1 += modelPart;
  line1 += PIPE + contextPart;
  if (gitPart) {
    line1 += PIPE + gitPart;
    if (displayDir !== ".") line1 += PIPE + dirPart;
  } else {
    line1 += PIPE + dirPart;
  }

  // --- Assemble Lines 2-3 ---
  const line2 = sessionBar + sessionResetPart;
  const line3 = weeklyBar + weeklyResetPart;

  // --- Print ---
  process.stdout.write(`${line1}\n${line2}\n${line3}\n`);
}

export default function () {
  return main().catch((e) => {
    debugLog("fatal:", e.message);
    process.exit(1);
  });
}
