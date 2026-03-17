# Claude Statusline

Custom status line for Claude Code showing model identity, context usage, session/weekly rate limits, git repo+branch, and working directory.

## Structure

- `.claude/statusline-command.sh` — Main statusline script, renders three-line status bar
- `.claude/commit-progress-bar.sh` — Rendering utilities: progress bars with sub-character precision and optional explicit color, colored badges
- `install.js` — Creates symlinks from `~/.claude/` into this repo (runs automatically via `npm install`)

The install script:

- Symlinks `.claude/*.sh` into `~/.claude/`
- Backs up any existing files to `*.bak`
- Adds `statusLine` config to `~/.claude/settings.json` if missing
- Is idempotent (safe to re-run)
- Runs as a `postinstall` hook — just run `npm install`

## How it works

The statusline command receives JSON from Claude Code via stdin with context window, model, and cost info. It also fetches usage data from the Anthropic API (cached for 5 minutes via OAuth token from macOS Keychain or `~/.claude/.credentials.json`).

**Line 1:** Model name in blue | ✍️ context % in yellow | repo (branch*) in green | directory in gray — pipe-separated
**Line 2:** `current` label (green) + green progress bar + percentage + reset countdown
**Line 3:** `weekly` label (yellow) + yellow progress bar + percentage + reset countdown

### Visual design

- **Sub-character precision**: Unicode eighth-block characters for smooth bar progression
- **Explicit bar colors**: green for session (current), yellow for weekly
- **Pipe-separated info bar**: dim gray `|` between line 1 elements
- **Smart countdowns**: relative (↻1h32m) when < 2h, 12-hour am/pm when same day, lowercase month+day otherwise

## Dependencies

- `bash`, `node`, `curl`, `git`

## Rules

- Never change the poll limit
