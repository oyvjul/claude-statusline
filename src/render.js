import { ansi, ansiBg, RESET } from "./ansi.js";

// Sub-character block elements (1/8 through 7/8)
const BAR_BLOCKS = ["\u258f", "\u258e", "\u258d", "\u258c", "\u258b", "\u258a", "\u2589"];

/**
 * Get threshold color RGB based on percentage.
 * @returns {[number,number,number]}
 */
export function getThresholdColor(pct) {
  if (pct >= 90) return [90, 170, 255];
  if (pct >= 75) return [60, 145, 230];
  if (pct >= 50) return [45, 115, 195];
  return [35, 85, 155];
}

/**
 * Render a progress bar with sub-character precision.
 * @param {number} pct - Percentage (0-100)
 * @param {number} width - Bar width in characters
 * @param {[number,number,number]} [colorRgb] - Explicit RGB color, or threshold-based
 * @returns {string}
 */
export function renderBar(pct, width = 20, colorRgb) {
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
    bar += BG_EMPTY + FG_FILL + BAR_BLOCKS[subIndex - 1];
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
 * @param {string} text
 * @param {[number,number,number]} fgRgb
 * @param {[number,number,number]} bgRgb
 * @returns {string}
 */
export function renderBadge(text, fgRgb, bgRgb) {
  const [fr, fg, fb] = fgRgb;
  const [br, bg, bb] = bgRgb;
  return `\x1b[1;38;2;${fr};${fg};${fb}m${ansiBg(br, bg, bb)} ${text} ${RESET}`;
}

/**
 * Render a progress bar with centered text label overlay.
 * @param {number} pct - Percentage (0-100)
 * @param {string} [label='COMMIT']
 * @param {[number,number,number]} [fillRgb=[45,90,160]]
 * @returns {string}
 */
export function renderCommitBar(pct, label = "COMMIT", fillRgb = [45, 90, 160]) {
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
    const ch = barText[i];
    if (i < fillCells) {
      bar += BG_FILL + FG_FILL + ch;
    } else {
      bar += BG_EMPTY + FG_EMPTY + ch;
    }
  }

  return bar + RESET;
}
