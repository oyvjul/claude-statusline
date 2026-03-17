import { ansi, ansiBg, RESET } from "./utils/ansi.js";
import type { RGB } from "./types.js";

// Sub-character block elements (1/8 through 7/8)
const BAR_BLOCKS = ["\u258f", "\u258e", "\u258d", "\u258c", "\u258b", "\u258a", "\u2589"];

/**
 * Get threshold color RGB based on percentage.
 */
export function getThresholdColor(pct: number): RGB {
  if (pct >= 90) return [90, 170, 255];
  if (pct >= 75) return [60, 145, 230];
  if (pct >= 50) return [45, 115, 195];
  return [35, 85, 155];
}

/**
 * Render a progress bar with sub-character precision.
 */
export function renderBar(pct: number, width = 20, colorRgb?: RGB): string {
  pct = Math.max(0, Math.min(100, pct || 0));
  const [r, g, b] = colorRgb || getThresholdColor(pct);

  const BG_FILL = ansiBg(r, g, b);
  const FG_FILL = ansi(r, g, b);
  const FG_EMPTY = ansi(60, 60, 60);
  const BG_EMPTY = ansiBg(28, 28, 28);

  const fillTotal = Math.floor((pct * width * 8) / 100);
  let fillCells = Math.floor(fillTotal / 8);
  const subIndex = fillTotal % 8;

  if (fillCells > width) fillCells = width;

  let bar = "";

  // Full cells
  for (let i = 0; i < fillCells && i < width; i++) {
    bar += BG_FILL + " ";
  }

  // Fractional cell
  if (fillCells < width && subIndex > 0) {
    bar += BG_EMPTY + FG_FILL + (BAR_BLOCKS[subIndex - 1] ?? " ");
    fillCells++;
  }

  // Empty cells
  for (let i = fillCells; i < width; i++) {
    bar += BG_EMPTY + FG_EMPTY + "\u2591";
  }

  return bar + RESET;
}

/**
 * Render a colored badge with background.
 */
export function renderBadge(text: string, fgRgb: RGB, bgRgb: RGB): string {
  const [fr, fg, fb] = fgRgb;
  const [br, bg, bb] = bgRgb;
  return `\x1b[1;38;2;${fr};${fg};${fb}m${ansiBg(br, bg, bb)} ${text} ${RESET}`;
}

/**
 * Render a progress bar with centered text label overlay.
 */
export function renderCommitBar(pct: number, label = "COMMIT", fillRgb: RGB = [45, 90, 160]): string {
  const BAR_WIDTH = 24;
  pct = Math.max(0, Math.min(100, pct || 0));

  const padLeft = Math.floor((BAR_WIDTH - label.length) / 2);
  const padRight = BAR_WIDTH - label.length - padLeft;
  const barText = " ".repeat(padLeft) + label + " ".repeat(padRight);

  const [fr, fg, fb] = fillRgb;
  const BG_FILL = ansiBg(fr, fg, fb);
  const BG_EMPTY = "\x1b[48;5;234m";
  const FG_FILL = "\x1b[1;38;2;200;200;200m";
  const FG_EMPTY = "\x1b[1;38;2;120;120;120m";

  let fillCells = Math.floor((pct * BAR_WIDTH) / 100);
  if (fillCells > BAR_WIDTH) fillCells = BAR_WIDTH;

  let bar = "";
  for (let i = 0; i < BAR_WIDTH; i++) {
    const ch = barText[i] ?? " ";
    if (i < fillCells) {
      bar += BG_FILL + FG_FILL + ch;
    } else {
      bar += BG_EMPTY + FG_EMPTY + ch;
    }
  }

  return bar + RESET;
}
