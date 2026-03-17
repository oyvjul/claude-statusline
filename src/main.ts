import os from "node:os";
import { RESET } from "./utils/ansi.js";
import { renderCommitBar } from "./render.js";
import { fetchUsage, debugLog } from "./utils/api.js";
import { getGitInfo } from "./utils/git.js";
import { formatReset } from "./utils/format.js";
import type { StatusInput, GitInfo, RGB } from "./types.js";
import {
  C_MODEL, C_CTX, C_REPO, C_DIR, C_PIPE, C_CURRENT, C_WEEKLY,
  C_PCT, C_RESET_TIME, COMMIT_GRADIENT, PIPE,
} from "./theme.js";

// Security
process.umask(0o077);

function buildModelSection(data: StatusInput): string {
  const displayName = data.model?.display_name || "";
  const modelId = data.model?.id || "";
  const verMatch = modelId.match(/(\d+)-(\d+)(?:-\d+)?$/);
  const ver = verMatch ? `${verMatch[1]}.${verMatch[2]}` : "";
  const modelVersion =
    displayName && ver ? `${displayName} ${ver}` : displayName || "";

  const commitLetters = "COMMIT";
  let commitGradient = "";
  for (let i = 0; i < commitLetters.length; i++) {
    const color = COMMIT_GRADIENT[i]!;
    const [r, g, b] = color;
    commitGradient += `\x1b[1;38;2;${r};${g};${b}m${commitLetters[i]!}`;
  }
  commitGradient += RESET;

  const modelPart = modelVersion ? `${C_MODEL}${modelVersion}${RESET}` : "";
  return `${commitGradient} ${C_PIPE}\u00b7${RESET} ${modelPart}`;
}

function buildContextSection(data: StatusInput): string {
  const usedPct = data.context_window?.used_percentage;
  const usedInt = usedPct != null ? Math.round(usedPct) : 0;
  return `\u270d\ufe0f ${C_CTX}${usedInt}%${RESET}`;
}

function buildGitSection(
  cwd: string,
  gitInfo: GitInfo | null,
): { gitPart: string; dirPart: string; hasSubdir: boolean } {
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
    if (displayDir !== ".") {
      displayDir = "." + relDir;
    }
  } else {
    displayDir = cwd.startsWith(os.homedir())
      ? "~" + cwd.slice(os.homedir().length)
      : cwd;
  }

  const dirPart = `${C_DIR}${displayDir}${RESET}`;
  return { gitPart, dirPart, hasSubdir: displayDir !== "." };
}

function buildUsageLine(
  pct: number,
  label: string,
  labelColor: string,
  fillRgb: RGB,
  resetIso: string | undefined,
): string {
  const intPct = pct != null ? Math.round(pct) : 0;
  const padded = String(intPct).padStart(3, " ");
  const padding = " ".repeat(8 - label.length);
  const bar = `${labelColor}${label}${RESET}${padding}${renderCommitBar(intPct, "COMMIT", fillRgb)} ${C_PCT}${padded}%${RESET}`;
  const resetFmt = formatReset(resetIso);
  const resetPart = resetFmt ? `  ${C_RESET_TIME}${resetFmt}${RESET}` : "";
  return bar + resetPart;
}

async function main(): Promise<void> {
  // Read stdin
  let input = "";
  if (!process.stdin.isTTY) {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk as Buffer);
    }
    input = Buffer.concat(chunks).toString("utf8");
  }

  let data: StatusInput = {};
  try {
    data = JSON.parse(input) as StatusInput;
  } catch {
    /* empty or invalid */
  }

  // Fetch usage (async) + git info (sync) in parallel
  const usagePromise = fetchUsage();
  const cwd = data.workspace?.current_dir || data.cwd || process.cwd();
  const gitInfo = getGitInfo(cwd);
  const usage = await usagePromise;

  // Build sections
  const modelSection = buildModelSection(data);
  const contextSection = buildContextSection(data);
  const { gitPart, dirPart, hasSubdir } = buildGitSection(cwd, gitInfo);

  // Assemble Line 1
  let line1 = modelSection;
  line1 += PIPE + contextSection;
  if (gitPart) {
    line1 += PIPE + gitPart;
    if (hasSubdir) {
      line1 += PIPE + dirPart;
    }
  } else {
    line1 += PIPE + dirPart;
  }

  // Assemble Lines 2-3
  const line2 = buildUsageLine(usage?.five_hour?.utilization ?? 0, "current", C_CURRENT, [30, 110, 170], usage?.five_hour?.resets_at);
  const line3 = buildUsageLine(usage?.seven_day?.utilization ?? 0, "weekly", C_WEEKLY, [25, 65, 130], usage?.seven_day?.resets_at);

  process.stdout.write(`${line1}\n${line2}\n${line3}\n`);
}

export default function (): Promise<void> {
  return main().catch((e: unknown) => {
    debugLog("fatal:", e instanceof Error ? e.message : String(e));
    process.exit(1);
  });
}
