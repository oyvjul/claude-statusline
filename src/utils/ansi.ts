export const ansi = (r: number, g: number, b: number): string =>
  `\x1b[38;2;${r};${g};${b}m`;
export const ansiBg = (r: number, g: number, b: number): string =>
  `\x1b[48;2;${r};${g};${b}m`;
export const RESET = "\x1b[0m";
