import path from "node:path";
import { execSync } from "node:child_process";

export function run(cmd, cwd) {
  return execSync(cmd, {
    encoding: "utf8",
    cwd,
    stdio: ["pipe", "pipe", "ignore"],
  }).trim();
}

export function getGitInfo(cwd) {
  try {
    const gitRoot = run(
      "git --no-optional-locks rev-parse --show-toplevel",
      cwd,
    );
    if (!gitRoot) return null;

    const repoName = path.basename(gitRoot);
    let branch = "";
    try {
      branch = run("git --no-optional-locks branch --show-current", gitRoot);
    } catch {}
    if (!branch) {
      try {
        branch = run(
          "git --no-optional-locks symbolic-ref --short HEAD",
          gitRoot,
        );
      } catch {}
    }
    // Sanitize ANSI from branch name
    branch = branch.replace(/\x1b/g, "");

    let dirty = "";
    if (branch) {
      try {
        const status = run("git --no-optional-locks status -s", gitRoot);
        if (status) dirty = "*";
      } catch {}
    }

    return { gitRoot, repoName, branch, dirty };
  } catch {
    return null;
  }
}
