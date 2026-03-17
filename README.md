# Claude Statusline

A custom three-line status bar for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) that shows model info, context usage, rate limits, and git status — all with a monochrome ocean color scheme.

![Claude Statusline screenshot](static/screenshot.png)

## Tested on

- [x] macOS
- [ ] Linux
- [ ] Windows

## What it shows

**Line 1** — Gradient "COMMIT" label, model name, context window usage %, git branch (with dirty indicator), and repo name

**Line 2** — Session (5-hour) rate limit progress bar with percentage and reset countdown

**Line 3** — Weekly (7-day) rate limit progress bar with percentage and reset countdown

Rate limit data is fetched from the Anthropic API and cached for 3 minutes.

## Install

```sh
git clone https://github.com/your-user/claude-statusline.git
cd claude-statusline
npm install
npm run build
npm run configure
```

- `npm install` — installs TypeScript and type definitions
- `npm run build` — compiles `src/*.ts` to `dist/*.js`
- `npm run configure` — writes `statusLine` config to `~/.claude/settings.json`

Restart Claude Code to see the status line.

## Requirements

- macOS (uses Keychain for OAuth token lookup, with fallback to `~/.claude/.credentials.json`)
- Node.js 22+, `git`

## Files

| File | Purpose |
|------|---------|
| `src/*.ts` | TypeScript source — main logic, rendering, ANSI helpers, git info, usage fetching, formatting |
| `src/types.ts` | Shared interfaces (`StatusInput`, `UsageData`, `GitInfo`) and type alias (`RGB`) |
| `dist/*.js` | Compiled ESM output (gitignored) |
| `.claude/statusline-command.js` | Thin entry point (3-line wrapper) referenced by `~/.claude/settings.json` |
| `install.js` | Configures `~/.claude/settings.json` to point to this repo |
| `tsconfig.json` | TypeScript config (`strict`, `noUncheckedIndexedAccess`, ESM/nodenext) |

## Customization

Colors are defined as RGB values in `src/main.ts` under the "Color palette" section. The progress bar width, label text, and fill colors can be adjusted in the `renderCommitBar` calls in the same file.
