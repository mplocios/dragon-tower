import { Difficulty, DiffConfig } from './types';

export const CW = 520;
export const CH = 780;
export const PAD = 40;
export const TGAP = 6;
export const RGAP = 5;
export const WALL_H = 52;
/** Reference column count for fixed grid width (Medium = 3 cols) */
export const REF_COLS = 3;
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

export const PANEL_H = 200;
export const CH_MOBILE = CH + PANEL_H;

export const INITIAL_BALANCE = 100000.23;
export const INITIAL_BET = 5;

// ─── Grid Layout ────────────────────────────────────────────────────
/** Vertical space reserved above the grid (used in maxH calculation) */
export const GRID_TOP_RESERVE = 50;
/** Tile height-to-width aspect ratio cap (desktop) */
export const TILE_ASPECT_RATIO = 0.31;
/** Tile height-to-width aspect ratio cap (mobile — smaller to leave space for panel) */
export const TILE_ASPECT_RATIO_MOBILE = 0.30;
/** Bottom margin below the grid */
export const GRID_BOTTOM_MARGIN = 100;
/** Grid layer y-offset applied during init */
export const GRID_LAYER_Y = -40;

// ─── Frame / Border ─────────────────────────────────────────────────
/** Padding inset from PAD for frame origin (fx = PAD - FRAME_PAD) */
export const FRAME_PAD = 13;
/** Extra height added inside the frame (fh = gridH + FRAME_INNER_PAD) */
export const FRAME_INNER_PAD = 26;
/** Row height for brick pattern lines */
export const BRICK_ROW_H = 20;
/** Column spacing for brick pattern verticals */
export const BRICK_COL_SPACING = 48;
/** Brick pattern horizontal offset for alternating rows */
export const BRICK_OFFSET = 24;
/** Inset for the inner dark fill (fx + FRAME_INNER_INSET) */
export const FRAME_INNER_INSET = 9;
/** Alpha of the inner dark fill */
export const FRAME_INNER_ALPHA = 0.75;

// ─── Wall / Dragon ──────────────────────────────────────────────────
/** Wall sprite width overshoot beyond frame width */
export const WALL_OVERSHOOT_W = 35;
/** Wall sprite height overshoot beyond WALL_H */
export const WALL_OVERSHOOT_H = 25;
/** Wall sprite x-offset from frame x */
export const WALL_OFFSET_X = 20;
/** Wall sprite y-offset from wall center-y */
export const WALL_OFFSET_Y = 10;
/** Wall bottom sprite height */
export const WALL_BOTTOM_H = 76;
/** Top flame bg width extension beyond frame width */
export const TOP_FLAME_W_EXT = 80;
/** Top flame bg height */
export const TOP_FLAME_H = 250;
/** Top flame y-anchor offset from wall center-y */
export const TOP_FLAME_Y_ANCHOR = 72;
/** Dragon normal sprite max width for scale calculation */
export const DRAGON_NORMAL_MAX_W = 270;
/** Dragon normal sprite max height for scale calculation */
export const DRAGON_NORMAL_MAX_H = 170;
/** Dragon fire sprite max width for scale calculation */
export const DRAGON_FIRE_MAX_W = 400;
/** Dragon fire sprite max height for scale calculation */
export const DRAGON_FIRE_MAX_H = 370;
/** Dragon sprite y-offset from wall center-y */
export const DRAGON_Y_OFFSET = 40;
/** Dragon glow circle radii (outer to inner) */
export const DRAGON_GLOW_RADII = [60, 40, 22] as const;
/** Dragon glow y-offset from wall center-y */
export const DRAGON_GLOW_Y_OFFSET = 10;

// ─── Play Button ────────────────────────────────────────────────────
/** Play button circle radius */
export const PLAY_R = 60;
/** Play button y-offset adjustment (negative = up, positive = down) */
export const PLAY_BTN_Y_OFFSET = 24;
/** Play button label font size (e.g. "CASH OUT") */
export const PLAY_LABEL_FONT = 14;
/** Play button amount font size (e.g. "5.00") */
export const PLAY_AMT_FONT = 18;
/** Play button coin icon size */
export const PLAY_COIN_SIZE = 22;

// ─── Mobile Panel ───────────────────────────────────────────────────
/** Mobile breakpoint width (window.innerWidth <= this) */
export const MOBILE_BREAKPOINT = 767;
/** Panel horizontal padding */
export const PANEL_PX = 25;
/** Panel vertical start padding */
export const PANEL_PY = 8;
/** Difficulty row card height */
export const PANEL_DIFF_H = 50;
/** Middle row card height (balance / random pick) */
export const PANEL_MID_H = 60;
/** Bottom row card height (bet / profit) */
export const PANEL_BOT_H = 75;
/** Gap between panel rows */
export const PANEL_ROW_GAP = 8;
/** Gap between middle row cards (balance & random pick) */
export const PANEL_MID_GAP = 20;
/** Gap between bottom row cards (bet & profit) */
export const PANEL_BOT_GAP = 90;
/** Panel layer y-offset from CH (panelLayer.y = CH - PANEL_Y_OFFSET) */
export const PANEL_Y_OFFSET = 80;
/** Label text color in panel cards */
export const PANEL_LBL_COLOR = 0x91a9b6;
/** Gold accent color for amounts in panel */
export const PANEL_GOLD_COLOR = 0xe8d080;
/** Panel label font size */
export const PANEL_LBL_FONT = 11;
/** Panel amount font size */
export const PANEL_AMT_FONT = 14;
/** Panel card inner left padding (text x offset) */
export const PANEL_INNER_PX = 15;
/** Random Pick card text x offset */
export const PANEL_RANDOM_INNER_PX = 74;
/** Total Profit card text x offset */
export const PANEL_PROFIT_INNER_PX = 38;
/** Panel card corner radius */
export const PANEL_CARD_RADIUS = 8;
/** Panel fallback card bg color */
export const PANEL_CARD_BG = 0x0d1520;
/** Difficulty text right margin from card edge */
export const PANEL_DIFF_RIGHT = 28;
/** Balance amount x offset from card left */
export const PANEL_BAL_AMT_X = 80;
/** Coin icon size (balance / profit) */
export const PANEL_COIN_SIZE = 16;
/** Coin gap after amount text */
export const PANEL_COIN_GAP = 12;
/** Bet coin icon size */
export const PANEL_BET_COIN_SIZE = 18;
/** Bet coin x position */
export const PANEL_BET_COIN_X = 22;
/** Bet amount x position */
export const PANEL_BET_AMT_X = 38;
/** Bet amount font size */
export const PANEL_BET_AMT_FONT = 16;
/** Bet label y position */
export const PANEL_BET_LBL_Y = 12;
/** Bet bottom row y offset from card bottom */
export const PANEL_BET_BOT_OFFSET = 25;
/** Arrow up button width */
export const PANEL_ARROW_UP_W = 40;
/** Arrow up button height */
export const PANEL_ARROW_UP_H = 24;
/** Arrow down button width */
export const PANEL_ARROW_DOWN_W = 50;
/** Arrow down button height */
export const PANEL_ARROW_DOWN_H = 30;
/** Arrow x offset from card right edge */
export const PANEL_ARROW_RIGHT = 72;
/** Arrow up y position */
export const PANEL_ARROW_UP_Y = 8;
/** Arrow down y position */
export const PANEL_ARROW_DOWN_Y = 36;
/** Profit label y position */
export const PANEL_PROFIT_LBL_Y = 14;
/** Profit multiplier gap after label */
export const PANEL_PROFIT_MULT_GAP = 5;
/** Profit amount font size */
export const PANEL_PROFIT_AMT_FONT = 16;
/** Profit bottom row y offset from card bottom */
export const PANEL_PROFIT_BOT_OFFSET = 20;
/** Profit coin gap after amount */
export const PANEL_PROFIT_COIN_GAP = 10;

// ─── Result Overlay ─────────────────────────────────────────────────
/** Result card width */
export const RESULT_CARD_W = 170;
/** Result card height */
export const RESULT_CARD_H = 150;
/** Result card corner radius */
export const RESULT_CARD_RADIUS = 14;
/** Multiplier text font size on result card */
export const RESULT_MULT_FONT_SIZE = 52;
/** Amount text font size on result card */
export const RESULT_AMT_FONT_SIZE = 13;
/** Coin icon size on result card */
export const RESULT_COIN_SIZE = 20;
/** Pop-out animation speed (t increment per tick) */
export const RESULT_POP_SPEED = 0.045;
/** Auto-dismiss delay for result overlay (ms) */
export const RESULT_AUTO_DISMISS_MS = 7000;

// ─── Particles ──────────────────────────────────────────────────────
/** Number of particles for fire tile reveal */
export const FIRE_PARTICLE_COUNT = 38;
/** Number of particles for sparkle tile reveal */
export const SPARKLE_PARTICLE_COUNT = 22;
/** Main explosion ring particle count on lose */
export const LOSE_MAIN_PARTICLES = 60;
/** Upward fire column particle count on lose */
export const LOSE_FIRE_COLUMN = 30;
/** Smoke cloud particle count on lose */
export const LOSE_SMOKE_PARTICLES = 20;
/** Delay before secondary lose explosion (ms) */
export const LOSE_SECONDARY_DELAY = 200;

// ─── Screen Shake ───────────────────────────────────────────────────
/** Maximum number of shake frames */
export const SHAKE_MAX_FRAMES = 16;
/** Shake displacement intensity (pixels) */
export const SHAKE_INTENSITY = 10;

// ─── Sprite Scale Factors ───────────────────────────────────────────
/** Egg icon width scale relative to tile width */
export const EGG_SCALE_W = 1.27;
/** Egg icon height scale relative to tile height */
export const EGG_SCALE_H = 1.15;
/** Egg icon y-offset from tile center (negative = higher) */
export const EGG_Y_OFFSET = -5;
/** Dragon icon width scale relative to tile width */
export const DRAGON_ICON_SCALE_W = 1.38;
/** Dragon icon height scale relative to tile height */
export const DRAGON_ICON_SCALE_H = 1.47;
/** Dragon icon y-offset from tile center (negative = higher) */
export const DRAGON_ICON_Y_OFFSET = -10;
/** Dragon icon float animation speed (lower = slower) */
export const DRAGON_ICON_FLOAT_SPEED = 0.02;
/** Dragon icon float animation amplitude (pixels) */
export const DRAGON_ICON_FLOAT_AMP = 2;
/** Dragon icon opacity (0-1) */
export const DRAGON_ICON_ALPHA = 0.9;
/** Dragon icon tint color (0xffffff = no tint, lower = darker) */
export const DRAGON_ICON_TINT = 0xffffff;
/** Dragon sprite frame count */
export const DRAGON_SPRITE_FRAMES = 29;
/** Dragon sprite animation speed */
export const DRAGON_SPRITE_SPEED = 0.4;
/** Dragon icon shadow width scale relative to tile width */
export const DRAGON_SHADOW_W = 0.2;
/** Dragon icon shadow height scale relative to tile height */
export const DRAGON_SHADOW_H = 0.12;
/** Dragon icon shadow y position offset relative to tile height */
export const DRAGON_SHADOW_Y = 0.30;
/** Dragon icon shadow base alpha */
export const DRAGON_SHADOW_ALPHA = 0.35;

// ─── Animation ──────────────────────────────────────────────────────
/** Frames between ambient ember spawns */
export const EMBER_SPAWN_INTERVAL = 8;
/** Ember particle spawn Y offset from bottom of canvas (higher = particles spawn higher) */
export const EMBER_Y_OFFSET = 100;
/** Dragon breathing scale amplitude */
export const DRAGON_BREATH_AMPLITUDE = 0.02;
/** Dragon breathing oscillation frequency */
export const DRAGON_BREATH_FREQ = 0.018;
/** Dragon glow alpha pulse frequency */
export const DRAGON_GLOW_PULSE_FREQ = 0.015;
/** Dragon glow scale oscillation frequency */
export const DRAGON_GLOW_SCALE_FREQ = 0.012;
/** Active row alpha pulse frequency */
export const ACTIVE_ROW_PULSE_FREQ = 0.06;
/** Flame border alpha pulse frequency */
export const FLAME_BORDER_PULSE_FREQ = 0.02;
/** Multiplier display scale lerp factor */
export const MULT_DISPLAY_LERP = 0.12;

// ─── Multiplier Display ─────────────────────────────────────────────
/** Multiplier display card width */
export const MULT_DISPLAY_W = 150;
/** Multiplier display card height */
export const MULT_DISPLAY_H = 64;
/** Multiplier display card corner radius */
export const MULT_DISPLAY_RADIUS = 14;
/** Multiplier display text font size */
export const MULT_DISPLAY_FONT_SIZE = 40;
/** Multiplier display y-position factor (gridY + gridH * factor) */
export const MULT_DISPLAY_Y_FACTOR = 0.32;

// ─── Flame Border ───────────────────────────────────────────────────
/** Flame border sprite width */
export const FLAME_BORDER_W = 150;
/** Flame border left sprite x-offset inward from frame edge */
export const FLAME_BORDER_LEFT_OFFSET = 115;
/** Flame border right sprite x-offset outward from frame edge */
export const FLAME_BORDER_RIGHT_OFFSET = 35;
/** Flame border y-offset above frame top */
export const FLAME_BORDER_Y_OFFSET = 50;

// ─── Vignette ───────────────────────────────────────────────────────
/** Vignette gradient stop positions as fractions of CH [top-of-bottom, height-of-bottom, height-of-top] */
export const VIGNETTE_STOPS = [0.58, 0.42, 0.15] as const;
