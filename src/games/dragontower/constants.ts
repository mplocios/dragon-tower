import { Difficulty, DiffConfig } from './types';

export const CW = 520;
export const CH = 780;
export const PAD = 40;
export const TGAP = 6;
export const RGAP = 5;
export const WALL_H = 52;
export const DIFF: Record<Difficulty, DiffConfig> = {
  Easy:   { cols: 4, eggs: 3, heads: 1, rows: 9 },
  Medium: { cols: 3, eggs: 2, heads: 1, rows: 9 },
  Hard:   { cols: 2, eggs: 1, heads: 1, rows: 9 },
  Expert: { cols: 3, eggs: 1, heads: 2, rows: 9 },
  Master: { cols: 4, eggs: 1, heads: 3, rows: 9 },
};

export const MULTS: Record<Difficulty, number[]> = {
  Easy: [1.32, 1.74, 2.32, 3.10, 4.13, 5.51, 7.34, 9.79, 13.05],
  Medium: [1.47, 2.21, 3.31, 4.96, 7.44, 11.16, 16.74, 25.11, 37.67],
  Hard: [1.96, 3.92, 7.84, 15.68, 31.36, 62.72, 125.44, 250.88, 501.76],
  Expert: [2.94, 8.82, 26.46, 79.38, 238.14, 714.42, 2143.26, 6429.78, 19289.34],
  Master: [3.92, 15.68, 62.72, 250.88, 1003.52, 4014.08, 16056.32, 64225.28, 256901.12]
};

export const INITIAL_BALANCE = 100000.23;
export const INITIAL_BET = 5;
