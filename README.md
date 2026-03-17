# Claude Statusline

A custom three-line status bar for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) that shows model info, context usage, rate limits, and git status — all with a monochrome ocean color scheme.

```
COMMIT · Opus 4.6 | ✍️ 42% | feat/my-branch* | my-repo
current ░░░░░░COMMIT░░░░░░░░  32%  ↻ 1h32m
weekly  ░░░░░░COMMIT░░░░░░░░  18%  ↻ mar 20, 6:00am
```

## What it shows

**Line 1** — Gradient "COMMIT" label, model name, context window usage %, git branch (with dirty indicator), and repo name

**Line 2** — Session (5-hour) rate limit progress bar with percentage and reset countdown

**Line 3** — Weekly (7-day) rate limit progress bar with percentage and reset countdown

Rate limit data is fetched from the Anthropic API and cached for 5 minutes.

## Install

```sh
git clone https://github.com/your-user/claude-statusline.git
cd claude-statusline
npm install
```

`npm install` runs the postinstall script which:

- Symlinks `.claude/*.sh` into `~/.claude/`
- Backs up any existing files to `*.bak`
- Adds `statusLine` config to `~/.claude/settings.json` if not already present

Restart Claude Code to see the status line.

## Requirements

- macOS (uses Keychain for OAuth token lookup, with fallback to `~/.claude/.credentials.json`)
- `bash`, `node`, `curl`, `git`

## Files

| File | Purpose |
|------|---------|
| `.claude/statusline-command.sh` | Main statusline script — parses Claude Code JSON input, fetches usage, renders output |
| `.claude/commit-progress-bar.sh` | Rendering utilities — progress bars with sub-character precision, colored badges |
| `install.js` | Symlink installer, runs automatically via `npm install` |

## Customization

Colors are defined as RGB values in `.claude/statusline-command.sh` under the "Color palette" section. The progress bar width, label text, and fill colors can be adjusted in the `render_commit_bar` calls.
