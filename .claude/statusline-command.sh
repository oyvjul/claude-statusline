#!/usr/bin/env bash

# Claude Code status line script

input=$(cat 2>/dev/null || true)

# Colors
DIM=$'\e[38;5;242m'
WHITE=$'\e[38;5;252m'
RESET=$'\e[0m'

SEP="${DIM} │ ${RESET}"

# --- Load progress bar ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/commit-progress-bar.sh"

# --- Parse JSON with node ---
parse_json() {
  local field="$1"
  if [ -n "$input" ]; then
    node -e "try{const d=JSON.parse(process.argv[1]);const v=$field;if(v!==undefined&&v!==null)console.log(v)}catch{}" "$input" 2>/dev/null
  fi
}

# --- Fetch usage from Anthropic API (cached) ---
USAGE_CACHE_DIR="$HOME/.cache/claude-statusline"
mkdir -p "$USAGE_CACHE_DIR" 2>/dev/null
chmod 700 "$USAGE_CACHE_DIR" 2>/dev/null
USAGE_CACHE="$USAGE_CACHE_DIR/usage-cache.json"
USAGE_CACHE_MAX_AGE=300  # seconds (5 minutes)

fetch_usage() {
  # Check cache freshness
  if [ -f "$USAGE_CACHE" ]; then
    local cache_age
    cache_age=$(( $(date +%s) - $(stat -f %m "$USAGE_CACHE" 2>/dev/null || stat -c %Y "$USAGE_CACHE" 2>/dev/null || echo 0) ))
    if [ "$cache_age" -lt "$USAGE_CACHE_MAX_AGE" ]; then
      cat "$USAGE_CACHE"
      return
    fi
  fi

  # Get OAuth token: macOS Keychain, then Linux/WSL fallback
  local token
  token=$(node -e "
    try {
      const cp = require('child_process');
      let creds;
      try {
        creds = cp.execSync('security find-generic-password -s \"Claude Code-credentials\" -w', {encoding:'utf8',stdio:['pipe','pipe','ignore']}).trim();
      } catch {
        creds = require('fs').readFileSync(require('os').homedir()+'/.claude/.credentials.json','utf8');
      }
      const j = JSON.parse(creds);
      if (j.claudeAiOauth?.accessToken) console.log(j.claudeAiOauth.accessToken);
    } catch {}
  " 2>/dev/null)
  [ -z "$token" ] && return

  # Fetch usage data
  local result
  result=$(curl -s --max-time 3 \
    -H "Authorization: Bearer $token" \
    -H "anthropic-beta: oauth-2025-04-20" \
    -H "Content-Type: application/json" \
    "https://api.anthropic.com/api/oauth/usage" 2>/dev/null)

  if [ -n "$result" ]; then
    echo "$result" > "$USAGE_CACHE"
    echo "$result"
  fi
}

usage_json=$(fetch_usage)

# Extract 5-hour and 7-day usage data
if [ -n "$usage_json" ]; then
  five_hour_pct=$(node -e "try{const d=JSON.parse(process.argv[1]);if(d.five_hour?.utilization!=null)console.log(d.five_hour.utilization)}catch{}" "$usage_json" 2>/dev/null)
  five_hour_reset=$(node -e "try{const d=JSON.parse(process.argv[1]);if(d.five_hour?.resets_at)console.log(d.five_hour.resets_at)}catch{}" "$usage_json" 2>/dev/null)
  seven_day_pct=$(node -e "try{const d=JSON.parse(process.argv[1]);if(d.seven_day?.utilization!=null)console.log(d.seven_day.utilization)}catch{}" "$usage_json" 2>/dev/null)
  seven_day_reset=$(node -e "try{const d=JSON.parse(process.argv[1]);if(d.seven_day?.resets_at)console.log(d.seven_day.resets_at)}catch{}" "$usage_json" 2>/dev/null)
fi

# --- Context bar ---
used=$(parse_json "d.context_window?.used_percentage")

if [ -n "$used" ]; then
  used_int=$(printf "%.0f" "$used")
  context_part="$(render_commit_bar "$used_int" "CONTEXT") ${WHITE}${used_int}%${RESET}"
else
  context_part="$(render_commit_bar 0 "CONTEXT") ${DIM}0%${RESET}"
fi

# --- Session (5-hour) bar ---
if [ -n "$five_hour_pct" ]; then
  five_hour_int=$(printf "%.0f" "$five_hour_pct")
  session_bar="$(render_commit_bar "$five_hour_int" "SESSION") ${WHITE}${five_hour_int}%${RESET}"
else
  session_bar="$(render_commit_bar 0 "SESSION") ${DIM}0%${RESET}"
fi

session_reset_part=""
if [ -n "$five_hour_reset" ]; then
  reset_time=$(node -e "try{const d=new Date(process.argv[1]);if(!isNaN(d))console.log(d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',hour12:false}))}catch{}" "$five_hour_reset" 2>/dev/null)
  [ -n "$reset_time" ] && session_reset_part=" ${DIM}resets ${reset_time}${RESET}"
fi

# --- Weekly (7-day) bar ---
if [ -n "$seven_day_pct" ]; then
  seven_day_int=$(printf "%.0f" "$seven_day_pct")
  weekly_bar="$(render_commit_bar "$seven_day_int" "WEEKLY") ${WHITE}${seven_day_int}%${RESET}"
else
  weekly_bar="$(render_commit_bar 0 "WEEKLY") ${DIM}0%${RESET}"
fi

weekly_reset_part=""
if [ -n "$seven_day_reset" ]; then
  weekly_reset_time=$(node -e "try{const d=new Date(process.argv[1]);if(!isNaN(d)){const day=d.toLocaleDateString([],{weekday:'short'});const time=d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',hour12:false});console.log(day+' '+time)}}catch{}" "$seven_day_reset" 2>/dev/null)
  [ -n "$weekly_reset_time" ] && weekly_reset_part=" ${DIM}resets ${weekly_reset_time}${RESET}"
fi

# --- Git branch + dirty ---
cwd=$(parse_json "d.workspace?.current_dir||d.cwd")
[ -z "$cwd" ] && cwd=$(pwd)

git_root=$(git -C "$cwd" --no-optional-locks rev-parse --show-toplevel 2>/dev/null)
branch_part=""
if [ -n "$git_root" ]; then
  branch=$(git -C "$git_root" --no-optional-locks branch --show-current 2>/dev/null)
  if [ -z "$branch" ]; then
    branch=$(git -C "$git_root" --no-optional-locks symbolic-ref --short HEAD 2>/dev/null)
  fi
  if [ -n "$branch" ]; then
    dirty=""
    dirty_check=$(git -C "$git_root" --no-optional-locks status -s 2>/dev/null | tail -n 1)
    [ -n "$dirty_check" ] && dirty=" "$'\e[38;2;70;130;210m'"*"
    branch_part="${SEP}${WHITE} ${branch}${dirty}${RESET}"
  fi
fi

# --- Current directory (compact: last 2 segments) ---
home_dir="$HOME"
display_dir="${cwd/#$home_dir/~}"
short_dir=$(echo "$display_dir" | awk -F/ '{if(NF<=2)print $0; else print $(NF-1)"/"$NF}')
dir_part="${SEP}${WHITE}${short_dir}${RESET}"

# --- Print status line (two lines) ---
printf "%s%s%s%s\n" "${context_part}" "${SEP}" "${branch_part#${SEP}}" "${dir_part}"
printf "%s%s${SEP}%s%s\n" "${session_bar}" "${session_reset_part}" "${weekly_bar}" "${weekly_reset_part}"
