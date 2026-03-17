import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";
import type { UsageData } from "../types.js";

// API fetch with file cache
const USAGE_CACHE_DIR = path.join(os.homedir(), ".cache", "claude-statusline");
const USAGE_CACHE = path.join(USAGE_CACHE_DIR, "usage-cache.json");
const USAGE_CACHE_MAX_AGE = 180; // seconds (3 minutes)

// Debug logging
const DEBUG = Boolean(process.env.CLAUDE_STATUSLINE_DEBUG);

export function debugLog(...args: unknown[]): void {
  if (DEBUG) {
    process.stderr.write(`[statusline] ${args.join(" ")}\n`);
  }
}

// Credentials
export function getOAuthToken(): string | null {
  try {
    // Try macOS Keychain first
    const creds = execSync(
      'security find-generic-password -s "Claude Code-credentials" -w',
      { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] },
    ).trim();

    const j = JSON.parse(creds) as {
      claudeAiOauth?: { accessToken?: string };
    };

    if (j.claudeAiOauth?.accessToken) {
      return j.claudeAiOauth.accessToken;
    }
  } catch (e) {
    debugLog(
      "keychain lookup failed:",
      e instanceof Error ? e.message : String(e),
    );
  }

  try {
    const credPath = path.join(os.homedir(), ".claude", ".credentials.json");
    const st = fs.statSync(credPath);

    if ((st.mode & 0o077) !== 0) {
      debugLog("ERROR: credentials file permissions too open");
      return null;
    }

    const j = JSON.parse(fs.readFileSync(credPath, "utf8")) as {
      claudeAiOauth?: { accessToken?: string };
    };

    if (j.claudeAiOauth?.accessToken) {
      return j.claudeAiOauth.accessToken;
    }
  } catch (e) {
    debugLog(
      "credentials file fallback failed:",
      e instanceof Error ? e.message : String(e),
    );
  }

  debugLog("no OAuth token found");
  return null;
}

export async function fetchUsage(): Promise<UsageData | null> {
  // Check cache
  try {
    const st = fs.statSync(USAGE_CACHE);
    const ageS = (Date.now() - st.mtimeMs) / 1000;
    if (ageS < USAGE_CACHE_MAX_AGE) {
      return JSON.parse(fs.readFileSync(USAGE_CACHE, "utf8")) as UsageData;
    }
  } catch (e) {
    debugLog("cache read skipped:", e instanceof Error ? e.message : String(e));
  }

  const token = getOAuthToken();

  if (!token) {
    debugLog("skipping API fetch: no token available");
    return null;
  }

  try {
    const resp = await fetch("https://api.anthropic.com/api/oauth/usage", {
      headers: {
        Authorization: `Bearer ${token}`,
        "anthropic-beta": "oauth-2025-04-20",
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(3000),
    });

    if (!resp.ok) {
      debugLog(`API responded ${resp.status} ${resp.statusText}`);
      return null;
    }

    const data: UsageData = await resp.json();

    try {
      fs.mkdirSync(USAGE_CACHE_DIR, { recursive: true, mode: 0o700 });
      fs.writeFileSync(USAGE_CACHE, JSON.stringify(data), { mode: 0o600 });
    } catch (e) {
      debugLog(
        "cache write failed:",
        e instanceof Error ? e.message : String(e),
      );
    }

    return data;
  } catch (e) {
    debugLog("fetch error:", e instanceof Error ? e.message : String(e));
    return null;
  }
}
