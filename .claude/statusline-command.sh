#!/usr/bin/env bash

# Claude Code status line script — 3-line layout

input=$(cat 2>/dev/null || true)

RESET=$'\e[0m'

# --- Load rendering utilities ---
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
  if [ -f "$USAGE_CACHE" ]; then
    local cache_age
    cache_age=$(( $(date +%s) - $(stat -f %m "$USAGE_CACHE" 2>/dev/null || stat -c %Y "$USAGE_CACHE" 2>/dev/null || echo 0) ))
    if [ "$cache_age" -lt "$USAGE_CACHE_MAX_AGE" ]; then
      cat "$USAGE_CACHE"
      return
    fi
  fi

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

# Extract usage data
if [ -n "$usage_json" ]; then
  five_hour_pct=$(node -e "try{const d=JSON.parse(process.argv[1]);if(d.five_hour?.utilization!=null)console.log(d.five_hour.utilization)}catch{}" "$usage_json" 2>/dev/null)
  five_hour_reset=$(node -e "try{const d=JSON.parse(process.argv[1]);if(d.five_hour?.resets_at)console.log(d.five_hour.resets_at)}catch{}" "$usage_json" 2>/dev/null)
  seven_day_pct=$(node -e "try{const d=JSON.parse(process.argv[1]);if(d.seven_day?.utilization!=null)console.log(d.seven_day.utilization)}catch{}" "$usage_json" 2>/dev/null)
  seven_day_reset=$(node -e "try{const d=JSON.parse(process.argv[1]);if(d.seven_day?.resets_at)console.log(d.seven_day.resets_at)}catch{}" "$usage_json" 2>/dev/null)
fi

# --- Smart reset countdown (12-hour am/pm format) ---
format_reset() {
  local reset_iso="$1"
  [ -z "$reset_iso" ] && return
  node -e "
    try {
      const reset = new Date(process.argv[1]);
      const now = new Date();
      if (isNaN(reset)) process.exit();
      const diffMs = reset - now;
      if (diffMs <= 0) { console.log('↻ now'); process.exit(); }
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 120) {
        const h = Math.floor(diffMin / 60);
        const m = diffMin % 60;
        console.log('↻ ' + (h > 0 ? h + 'h' : '') + (m > 0 || h === 0 ? m + 'm' : ''));
      } else if (reset.toDateString() === now.toDateString()) {
        // Same day: 7:00pm
        let hr = reset.getHours();
        const mn = String(reset.getMinutes()).padStart(2, '0');
        const ampm = hr >= 12 ? 'pm' : 'am';
        hr = hr % 12 || 12;
        console.log('↻ ' + hr + ':' + mn + ampm);
      } else {
        // Different day: mar 10, 10:00am
        const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
        const mon = months[reset.getMonth()];
        const day = reset.getDate();
        let hr = reset.getHours();
        const mn = String(reset.getMinutes()).padStart(2, '0');
        const ampm = hr >= 12 ? 'pm' : 'am';
        hr = hr % 12 || 12;
        console.log('↻ ' + mon + ' ' + day + ', ' + hr + ':' + mn + ampm);
      }
    } catch {}
  " "$reset_iso" 2>/dev/null
}

# --- Color palette ---
C_MODEL=$'\e[38;2;100;180;255m'      # sky blue: model name
C_CTX=$'\e[38;2;140;210;245m'        # ice cyan: context percentage
C_REPO=$'\e[38;2;80;155;225m'        # medium blue: repo + branch
C_DIRTY=$'\e[38;2;130;180;230m'      # light blue: dirty indicator
C_DIR=$'\e[38;2;100;120;155m'        # slate: directory
C_PIPE=$'\e[38;2;60;75;100m'         # dark blue-gray: pipe separators
C_CURRENT=$'\e[38;2;70;185;225m'     # cyan-blue: current label
C_WEEKLY=$'\e[38;2;120;160;210m'     # steel blue: weekly label
C_PCT=$'\e[38;2;200;215;240m'        # ice white: percentage text
C_RESET_TIME=$'\e[38;2;90;105;130m'  # muted slate: reset times

# COMMIT gradient (deep blue → light cyan)
C_CO1=$'\e[1;38;2;60;120;200m'
C_CO2=$'\e[1;38;2;80;145;215m'
C_CO3=$'\e[1;38;2;100;165;230m'
C_CO4=$'\e[1;38;2;120;185;240m'
C_CO5=$'\e[1;38;2;140;200;245m'
C_CO6=$'\e[1;38;2;160;215;250m'

PIPE=" ${C_PIPE}|${RESET} "

# --- Model name (plain text, blue) ---
model_version=$(node -e "
  try{
    const d=JSON.parse(process.argv[1]);
    const name=d.model?.display_name||'';
    const id=d.model?.id||'';
    // Extract version: claude-opus-4-6 -> 4.6, claude-sonnet-4-5 -> 4.5
    const m=id.match(/(\d+)-(\d+)(?:-\d+)?$/);
    const ver=m?m[1]+'.'+m[2]:'';
    if(name&&ver)console.log(name+' '+ver);
    else if(name)console.log(name);
  }catch{}" "$input" 2>/dev/null)

commit_gradient="${C_CO1}C${C_CO2}O${C_CO3}M${C_CO4}M${C_CO5}I${C_CO6}T${RESET}"

model_part=""
[ -n "$model_version" ] && model_part="${C_MODEL}${model_version}${RESET}"

# --- Context percentage ---
used=$(parse_json "d.context_window?.used_percentage")
used_int=0
[ -n "$used" ] && used_int=$(printf "%.0f" "$used")

context_part="✍️ ${C_CTX}${used_int}%${RESET}"

# --- Git: repo (branch*) ---
cwd=$(parse_json "d.workspace?.current_dir||d.cwd")
[ -z "$cwd" ] && cwd=$(pwd)

git_root=$(git -C "$cwd" --no-optional-locks rev-parse --show-toplevel 2>/dev/null)
git_part=""
if [ -n "$git_root" ]; then
  repo_name=$(basename "$git_root")
  branch=$(git -C "$git_root" --no-optional-locks branch --show-current 2>/dev/null)
  [ -z "$branch" ] && branch=$(git -C "$git_root" --no-optional-locks symbolic-ref --short HEAD 2>/dev/null)
  if [ -n "$branch" ]; then
    dirty=""
    dirty_check=$(git -C "$git_root" --no-optional-locks status -s 2>/dev/null | tail -n 1)
    [ -n "$dirty_check" ] && dirty="*"
    git_part="${C_REPO}${branch}${dirty}${RESET}${PIPE}${C_DIR}${repo_name}${RESET}"
  else
    git_part="${C_REPO}${repo_name}${RESET}"
  fi
fi

# --- Directory (relative to repo root if inside git repo) ---
home_dir="$HOME"
if [ -n "$git_root" ]; then
  rel_dir="${cwd#$git_root}"
  display_dir="${rel_dir:-.}"
  [ "$display_dir" != "." ] && display_dir=".${rel_dir}"
else
  display_dir="${cwd/#$home_dir/~}"
fi
dir_part="${C_DIR}${display_dir}${RESET}"

# --- Session (current) bar ---
five_hour_int=0
[ -n "$five_hour_pct" ] && five_hour_int=$(printf "%.0f" "$five_hour_pct")

five_hour_padded=$(printf "%3d" "$five_hour_int")
session_bar="${C_CURRENT}current${RESET} $(render_commit_bar "$five_hour_int" "COMMIT" "30;110;170") ${C_PCT}${five_hour_padded}%${RESET}"

session_reset_part=""
if [ -n "$five_hour_reset" ]; then
  reset_fmt=$(format_reset "$five_hour_reset")
  [ -n "$reset_fmt" ] && session_reset_part="  ${C_RESET_TIME}${reset_fmt}${RESET}"
fi

# --- Weekly bar ---
seven_day_int=0
[ -n "$seven_day_pct" ] && seven_day_int=$(printf "%.0f" "$seven_day_pct")

seven_day_padded=$(printf "%3d" "$seven_day_int")
weekly_bar="${C_WEEKLY}weekly${RESET}  $(render_commit_bar "$seven_day_int" "COMMIT" "25;65;130") ${C_PCT}${seven_day_padded}%${RESET}"

weekly_reset_part=""
if [ -n "$seven_day_reset" ]; then
  weekly_reset_fmt=$(format_reset "$seven_day_reset")
  [ -n "$weekly_reset_fmt" ] && weekly_reset_part="  ${C_RESET_TIME}${weekly_reset_fmt}${RESET}"
fi

# --- Assemble Line 1 ---
line1="${commit_gradient} ${C_PIPE}·${RESET} "
[ -n "$model_part" ] && line1="${line1}${model_part}"
line1="${line1}${PIPE}${context_part}"
if [ -n "$git_part" ]; then
  line1="${line1}${PIPE}${git_part}"
  # Show subdir only if not at repo root
  [ "$display_dir" != "." ] && line1="${line1}${PIPE}${dir_part}"
else
  line1="${line1}${PIPE}${dir_part}"
fi

# --- Assemble Lines 2-3 ---
line2="${session_bar}${session_reset_part}"
line3="${weekly_bar}${weekly_reset_part}"

# --- Print ---
printf "%s\n%s\n%s\n" "$line1" "$line2" "$line3"
