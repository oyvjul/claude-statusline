# Claude Statusline

Custom status line for Claude Code showing context usage, session/weekly rate limits, git branch, and working directory.

## Structure

- `.claude/statusline-command.sh` — Main statusline script, renders two-line status bar
- `.claude/commit-progress-bar.sh` — Reusable progress bar with label overlay and blue fill
- `install.sh` — Creates symlinks from `~/.claude/` into this repo

The install script:

- Symlinks `.claude/*.sh` into `~/.claude/`
- Backs up any existing files to `*.bak`
- Adds `statusLine` config to `~/.claude/settings.json` if missing
- Is idempotent (safe to re-run)

## How it works

The statusline command receives JSON from Claude Code via stdin with context window info. It also fetches usage data from the Anthropic API (cached for 5 minutes via OAuth token from macOS Keychain or `~/.claude/.credentials.json`).

**Line 1:** Context window bar, git branch (with dirty indicator), current directory
**Line 2:** Session (5-hour) usage bar with reset time, weekly (7-day) usage bar with reset time

## Dependencies

- `bash`, `node`, `curl`, `git`
