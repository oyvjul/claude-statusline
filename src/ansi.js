export const ansi = (r, g, b) => `\x1b[38;2;${r};${g};${b}m`;
export const ansiBg = (r, g, b) => `\x1b[48;2;${r};${g};${b}m`;
export const RESET = "\x1b[0m";
