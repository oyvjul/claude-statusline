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

# Render a progress bar with text label overlay inside the bar
# Usage: render_commit_bar <percentage> [label] [fill_rgb]
render_commit_bar() {
  local used_int="${1:-0}"
  local BAR_WIDTH=24
  local LABEL="${2:-COMMIT}"
  local fill_rgb="${3:-45;90;160}"
  local LABEL_LEN=${#LABEL}
  local LABEL_PAD_LEFT=$(( (BAR_WIDTH - LABEL_LEN) / 2 ))
  local LABEL_PAD_RIGHT=$(( BAR_WIDTH - LABEL_LEN - LABEL_PAD_LEFT ))

  # Build the full bar text (spaces + label + spaces)
  local bar_text=""
  local i
  for (( i=0; i<LABEL_PAD_LEFT; i++ )); do bar_text="${bar_text} "; done
  bar_text="${bar_text}${LABEL}"
  for (( i=0; i<LABEL_PAD_RIGHT; i++ )); do bar_text="${bar_text} "; done

  # ANSI color definitions
  local BG_FILL=$'\e[48;2;'"${fill_rgb}"'m'
  local BG_EMPTY=$'\e[48;5;234m'
  local FG_FILL=$'\e[1;38;2;200;200;200m'
  local FG_EMPTY=$'\e[1;38;2;120;120;120m'
  local RESET=$'\e[0m'

  local fill_cells=$(( used_int * BAR_WIDTH / 100 ))
  [ "$fill_cells" -gt "$BAR_WIDTH" ] && fill_cells=$BAR_WIDTH

  local bar=""
  for (( i=0; i<BAR_WIDTH; i++ )); do
    local ch="${bar_text:$i:1}"
    if [ "$i" -lt "$fill_cells" ]; then
      bar="${bar}${BG_FILL}${FG_FILL}${ch}"
    else
      bar="${bar}${BG_EMPTY}${FG_EMPTY}${ch}"
    fi
  done

  printf "%s%s" "${bar}" "${RESET}"
}
