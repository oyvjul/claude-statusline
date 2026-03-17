#!/usr/bin/env bash

# Rendering utilities for Claude Code statusline
# Provides: render_bar, render_badge, get_threshold_color, render_commit_bar

# Sub-character block elements (1/8 through 7/8)
_BAR_BLOCKS=("▏" "▎" "▍" "▌" "▋" "▊" "▉")

# Get threshold color RGB based on percentage
# Returns: "R;G;B"
get_threshold_color() {
  local pct="${1:-0}"
  if [ "$pct" -ge 90 ]; then
    echo "90;170;255"
  elif [ "$pct" -ge 75 ]; then
    echo "60;145;230"
  elif [ "$pct" -ge 50 ]; then
    echo "45;115;195"
  else
    echo "35;85;155"
  fi
}

# Render a progress bar with sub-character precision
# Usage: render_bar <percentage> <width> [color_rgb]
# If color_rgb (e.g. "80;200;80") is provided, use it instead of threshold color
render_bar() {
  local pct="${1:-0}"
  local width="${2:-20}"
  local explicit_color="${3:-}"
  local RESET=$'\e[0m'

  # Clamp
  [ "$pct" -lt 0 ] 2>/dev/null && pct=0
  [ "$pct" -gt 100 ] 2>/dev/null && pct=100

  # Color: explicit or threshold
  local color_rgb
  if [ -n "$explicit_color" ]; then
    color_rgb="$explicit_color"
  else
    color_rgb=$(get_threshold_color "$pct")
  fi
  local BG_FILL=$'\e[48;2;'"${color_rgb}"'m'
  local FG_FILL=$'\e[38;2;'"${color_rgb}"'m'

  # Empty cell styling
  local FG_EMPTY=$'\e[38;2;60;60;60m'
  local BG_EMPTY=$'\e[48;2;28;28;28m'

  # Sub-character precision: 8 positions per cell
  local fill_total=$(( pct * width * 8 / 100 ))
  local fill_cells=$(( fill_total / 8 ))
  local sub_index=$(( fill_total % 8 ))

  [ "$fill_cells" -gt "$width" ] && fill_cells=$width

  local bar=""
  local i

  # Full cells (colored background + space)
  for (( i=0; i<fill_cells && i<width; i++ )); do
    bar="${bar}${BG_FILL} "
  done

  # Fractional cell (block char with fill fg on empty bg)
  if [ "$fill_cells" -lt "$width" ] && [ "$sub_index" -gt 0 ]; then
    bar="${bar}${BG_EMPTY}${FG_FILL}${_BAR_BLOCKS[$((sub_index-1))]}"
    fill_cells=$((fill_cells + 1))
  fi

  # Empty cells
  for (( i=fill_cells; i<width; i++ )); do
    bar="${bar}${BG_EMPTY}${FG_EMPTY}░"
  done

  printf "%s%s" "${bar}" "${RESET}"
}

# Render a colored badge with background
# Usage: render_badge <text> <fg_r;g;b> <bg_r;g;b>
render_badge() {
  local text="$1"
  local fg_rgb="$2"
  local bg_rgb="$3"
  local RESET=$'\e[0m'

  printf "%s" $'\e[1;38;2;'"${fg_rgb}"'m'$'\e[48;2;'"${bg_rgb}"'m'" ${text} ${RESET}"
}

# Backward-compatible wrapper
render_commit_bar() {
  render_bar "${1:-0}" "${2:-20}"
}
