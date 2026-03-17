# Claude Statusline

Custom status line for Claude Code showing model identity, context usage, session/weekly rate limits, git repo+branch, and working directory.

## How it works

The statusline command receives JSON from Claude Code via stdin with context window, model, and cost info. It also fetches usage data from the Anthropic API (cached for 3 minutes via OAuth token from macOS Keychain or `~/.claude/.credentials.json`). Source is TypeScript (`src/*.ts`), compiled to ESM JavaScript (`dist/*.js`) via `tsc`. Uses Node.js `fetch()` for HTTP and `child_process.execSync` for git commands.

**Line 1:** Model name in blue | ✍️ context % in yellow | repo (branch\*) in green | directory in gray — pipe-separated
**Line 2:** `current` label (green) + green progress bar + percentage + reset countdown
**Line 3:** `weekly` label (yellow) + yellow progress bar + percentage + reset countdown

### Visual design

- **Sub-character precision**: Unicode eighth-block characters for smooth bar progression
- **Explicit bar colors**: green for session (current), yellow for weekly
- **Pipe-separated info bar**: dim gray `|` between line 1 elements
- **Smart countdowns**: relative (↻1h32m) when < 2h, 12-hour am/pm when same day, lowercase month+day otherwise

## Dependencies

- `node` (22+), `git`

## Rules

- Never change the poll limit
- Never use `any` typefor in TypeScript
- Always use curly braces for `if` statements, even single-line bodies
