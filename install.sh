#!/usr/bin/env bash
set -euo pipefail

# Install Claude statusline by symlinking scripts into ~/.claude/

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$HOME/.claude"

FILES=(
  "statusline-command.sh"
  "commit-progress-bar.sh"
)

# Ensure ~/.claude/ exists
mkdir -p "$CLAUDE_DIR"

for file in "${FILES[@]}"; do
  src="$REPO_DIR/.claude/$file"
  dest="$CLAUDE_DIR/$file"

  if [ ! -f "$src" ]; then
    echo "ERROR: Source file not found: $src"
    exit 1
  fi

  # Back up existing file if it's not already a symlink to us
  if [ -f "$dest" ] && [ ! -L "$dest" ]; then
    echo "Backing up existing $dest -> ${dest}.bak"
    mv "$dest" "${dest}.bak"
  elif [ -L "$dest" ]; then
    existing_target=$(readlink "$dest")
    if [ "$existing_target" = "$src" ]; then
      echo "Already linked: $file"
      continue
    fi
    echo "Replacing symlink: $dest (was -> $existing_target)"
    rm "$dest"
  fi

  ln -s "$src" "$dest"
  echo "Linked: $dest -> $src"
done

# Ensure settings.json has the statusLine config
SETTINGS="$CLAUDE_DIR/settings.json"
if [ -f "$SETTINGS" ]; then
  # Check if statusLine is already configured
  has_statusline=$(node -e "try{const s=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));console.log(s.statusLine?'yes':'no')}catch{console.log('no')}" "$SETTINGS" 2>/dev/null || echo "no")
  if [ "$has_statusline" = "no" ]; then
    # Add statusLine config using node to preserve existing settings
    node -e "
      const fs = require('fs');
      const settingsPath = process.argv[1];
      const claudeDir = process.argv[2];
      const s = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      s.statusLine = {
        type: 'command',
        command: 'bash ' + claudeDir + '/statusline-command.sh'
      };
      fs.writeFileSync(settingsPath, JSON.stringify(s, null, 2) + '\n');
    " "$SETTINGS" "$CLAUDE_DIR"
    echo "Added statusLine config to settings.json"
  else
    echo "statusLine already configured in settings.json"
  fi
else
  # Create minimal settings.json with statusLine
  cat > "$SETTINGS" << SETTINGSEOF
{
  "statusLine": {
    "type": "command",
    "command": "bash $CLAUDE_DIR/statusline-command.sh"
  }
}
SETTINGSEOF
  echo "Created settings.json with statusLine config"
fi

echo ""
echo "Done! Claude statusline is installed."
echo "Restart Claude Code to see the status line."
