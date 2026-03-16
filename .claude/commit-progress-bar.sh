#!/usr/bin/env bash

# COMMIT Progress Bar
# A progress bar with "COMMIT" text overlay, filled with a blue background color.
# Usage: source this file, then call render_commit_bar <percentage>

render_commit_bar() {
  local used_int="${1:-0}"
  local BAR_WIDTH=24
  local LABEL="${2:-COMMIT}"
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
  local BG_FILL=$'\e[48;2;45;90;160m'     # medium blue background (fill)
  local BG_EMPTY=$'\e[48;5;234m'           # near-black background (empty)
  local FG_FILL=$'\e[1;38;2;255;255;255m'  # bold bright white on fill
  local FG_EMPTY=$'\e[1;38;5;252m'         # bright white on empty (slightly softer)
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
