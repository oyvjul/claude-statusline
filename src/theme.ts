import { ansi, RESET } from "./utils/ansi.js";
import type { RGB } from "./types.js";

export const C_MODEL = ansi(100, 180, 255); // sky blue
export const C_CTX = ansi(140, 210, 245); // ice cyan
export const C_REPO = ansi(80, 155, 225); // medium blue
export const C_DIR = ansi(100, 120, 155); // slate
export const C_PIPE = ansi(60, 75, 100); // dark blue-gray
export const C_CURRENT = ansi(70, 185, 225); // cyan-blue
export const C_WEEKLY = ansi(120, 160, 210); // steel blue
export const C_PCT = ansi(200, 215, 240); // ice white
export const C_RESET_TIME = ansi(90, 105, 130); // muted slate

// COMMIT gradient (deep blue -> light cyan)
export const COMMIT_GRADIENT: readonly RGB[] = [
  [60, 120, 200], [80, 145, 215], [100, 165, 230],
  [120, 185, 240], [140, 200, 245], [160, 215, 250],
];

export const PIPE = ` ${C_PIPE}|${RESET} `;
