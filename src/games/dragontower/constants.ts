import { Difficulty, DiffConfig } from './types';

// ─── Canvas & Core ──────────────────────────────────────────────────
export const CW = 520;
export const CH = 780;
export const PAD = 40;
/** Horizontal padding on mobile (left/right only) — lower = wider tiles */
export const PAD_MOBILE = 22;
/** Desktop canvas height fill factor (0–1, fraction of viewport height) */
export const DESKTOP_SCALE = 0.97;
export const INITIAL_BALANCE = 100000.23;
export const INITIAL_BET = 5;

// ─── Difficulty & Multipliers ───────────────────────────────────────
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

// ─── Grid Layout ────────────────────────────────────────────────────
/** Horizontal gap between tiles (columns) */
export const TGAP = 8;
/** Vertical gap between tiles (rows) */
export const RGAP = 8;
/** Wall height */
export const WALL_H = 52;
/** Vertical space reserved above the grid */
export const GRID_TOP_RESERVE = 50;
/** Tile height-to-width aspect ratio cap (desktop) */
export const TILE_ASPECT_RATIO = 0.31;
/** Tile height-to-width aspect ratio cap (mobile) */
export const TILE_ASPECT_RATIO_MOBILE = 0.30;
/** Bottom margin below the grid */
export const GRID_BOTTOM_MARGIN = 100;
/** Grid layer y-offset applied during init */
export const GRID_LAYER_Y = 10;

// ─── Frame / Border ─────────────────────────────────────────────────
/** Padding inset from PAD for frame origin */
export const FRAME_PAD = 13;
/** Extra height added inside the frame */
export const FRAME_INNER_PAD = 26;
/** Row height for brick pattern lines */
export const BRICK_ROW_H = 20;
/** Column spacing for brick pattern verticals */
export const BRICK_COL_SPACING = 48;
/** Brick pattern horizontal offset for alternating rows */
export const BRICK_OFFSET = 24;
/** Inset for the inner dark fill */
export const FRAME_INNER_INSET = 9;
/** Alpha of the inner dark fill */
export const FRAME_INNER_ALPHA = 0.75;

// ─── Wall / Dragon Sprite ──────────────────────────────────────────
/** Wall sprite width overshoot beyond frame width */
export const WALL_OVERSHOOT_W = 40;
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
export const TOP_FLAME_H = 450;
/** Top flame y-anchor offset from wall center-y */
export const TOP_FLAME_Y_ANCHOR = 118;
/** Dragon normal sprite max width */
export const DRAGON_NORMAL_MAX_W = 270;
/** Dragon normal sprite max height */
export const DRAGON_NORMAL_MAX_H = 170;
/** Dragon fire sprite max width */
export const DRAGON_FIRE_MAX_W = 400;
/** Dragon fire sprite max height */
export const DRAGON_FIRE_MAX_H = 470;
/** Dragon sprite y-offset from wall center-y */
export const DRAGON_Y_OFFSET = 40;
/** Dragon sprite frame count */
export const DRAGON_SPRITE_FRAMES = 29;
/** Dragon sprite animation speed */
export const DRAGON_SPRITE_SPEED = 0.4;

// ─── Dragon Glow ────────────────────────────────────────────────────
/** Dragon glow circle radii (outer to inner) */
export const DRAGON_GLOW_RADII = [60, 40, 22] as const;
/** Dragon glow x-offset from center */
export const DRAGON_GLOW_X_OFFSET = 0;
/** Dragon glow y-offset from wall center-y */
export const DRAGON_GLOW_Y_OFFSET = 0;
/** Dragon glow colors [outer, middle, inner] */
export const DRAGON_GLOW_COLORS = [0xff4400, 0xff6600, 0x000000] as const;
/** Dragon glow alphas [outer, middle, inner] */
export const DRAGON_GLOW_ALPHAS = [0.08, 0.12, 0.18] as const;
/** Dragon glow gradient steps */
export const DRAGON_GLOW_STEPS = 25;
/** Dragon glow gradient color */
export const DRAGON_GLOW_GRADIENT_COLOR = 0xff5500;
/** Dragon glow min alpha (outer edge) */
export const DRAGON_GLOW_ALPHA_MIN = 0.001;
/** Dragon glow max alpha (center) */
export const DRAGON_GLOW_ALPHA_MAX = 0.02;

// ─── Dragon Icon (tile icons) ───────────────────────────────────────
/** Egg icon width scale relative to tile width */
export const EGG_SCALE_W = 1.27;
/** Egg icon height scale relative to tile height */
export const EGG_SCALE_H = 1.15;
/** Egg icon y-offset from tile center */
export const EGG_Y_OFFSET = -5;
/** Dragon icon width scale relative to tile width */
export const DRAGON_ICON_SCALE_W = 1.38;
/** Dragon icon height scale relative to tile height */
export const DRAGON_ICON_SCALE_H = 1.47;
/** Dragon icon y-offset from tile center */
export const DRAGON_ICON_Y_OFFSET = -10;
/** Dragon icon float animation speed */
export const DRAGON_ICON_FLOAT_SPEED = 0.02;
/** Dragon icon float animation amplitude (pixels) */
export const DRAGON_ICON_FLOAT_AMP = 2;
/** Dragon icon opacity */
export const DRAGON_ICON_ALPHA = 0.9;
/** Dragon icon tint color (0xffffff = no tint) */
export const DRAGON_ICON_TINT = 0xffffff;
/** Dragon icon shadow width scale */
export const DRAGON_SHADOW_W = 0.2;
/** Dragon icon shadow height scale */
export const DRAGON_SHADOW_H = 0.12;
/** Dragon icon shadow y position offset */
export const DRAGON_SHADOW_Y = 0.30;
/** Dragon icon shadow base alpha */
export const DRAGON_SHADOW_ALPHA = 0.35;

// ─── Top Lighting ───────────────────────────────────────────────────
/** Top lighting width extension beyond frame width */
export const TOP_LIGHTING_W_EXT = 180;
/** Top lighting height extension beyond WALL_H */
export const TOP_LIGHTING_H_EXT = 160;
/** Top lighting y-offset from wall center-y */
export const TOP_LIGHTING_Y_OFFSET = 20;

// ─── Flame Border ───────────────────────────────────────────────────
/** Flame border sprite width */
export const FLAME_BORDER_W = 170;
/** Flame border left sprite x-offset inward from frame edge */
export const FLAME_BORDER_LEFT_OFFSET = 130;
/** Flame border right sprite x-offset outward from frame edge */
export const FLAME_BORDER_RIGHT_OFFSET = 40;
/** Flame border y-offset above frame top */
export const FLAME_BORDER_Y_OFFSET = 0;

// ─── Mobile Panel — Layout ──────────────────────────────────────────
/** Mobile breakpoint width */
export const MOBILE_BREAKPOINT = 767;
/** Mobile canvas height (includes panel) */
export const PANEL_H = 200;
export const CH_MOBILE = CH + PANEL_H;
/** Panel horizontal padding */
export const PANEL_PX = 8;
/** Panel vertical start padding */
export const PANEL_PY = 8;
/** Panel layer y-offset from CH */
export const PANEL_Y_OFFSET = 35;
/** Gap between panel rows */
export const PANEL_ROW_GAP = 8;

// ─── Mobile Panel — Card Sizes ──────────────────────────────────────
/** Difficulty row card height */
export const PANEL_DIFF_H = 50;
/** Middle row card height (balance / random pick) */
export const PANEL_MID_H = 57;
/** Bottom row card height (bet / profit) */
export const PANEL_BOT_H = 80;
/** Gap between middle row cards (balance & random pick) */
export const PANEL_MID_GAP = 15;
/** Gap between bottom row cards (bet & profit) */
export const PANEL_BOT_GAP = 85;
/** Panel card corner radius */
export const PANEL_CARD_RADIUS = 8;
/** Panel fallback card bg color */
export const PANEL_CARD_BG = 0x0d1520;

// ─── Mobile Panel — Typography ──────────────────────────────────────
/** Label text color */
export const PANEL_LBL_COLOR = 0x91a9b6;
/** Amount text color */
export const PANEL_GOLD_COLOR = 0xffffff;
/** Label font size */
export const PANEL_LBL_FONT = 13;
/** Amount font size */
export const PANEL_AMT_FONT = 16;

// ─── Mobile Panel — Difficulty Card ─────────────────────────────────
/** Difficulty text right margin from card edge */
export const PANEL_DIFF_RIGHT = 28;
/** Card inner left padding (text x offset) */
export const PANEL_INNER_PX = 15;

// ─── Mobile Panel — Balance Card ────────────────────────────────────
/** Balance amount x offset from card left */
export const PANEL_BAL_AMT_X = 105;
/** Coin icon size (balance / profit) */
export const PANEL_COIN_SIZE = 16;
/** Coin gap after amount text */
export const PANEL_COIN_GAP = 12;

// ─── Mobile Panel — Random Pick Card ────────────────────────────────
/** Random Pick card text x offset */
export const PANEL_RANDOM_INNER_PX = 74;

// ─── Mobile Panel — Bet Card ────────────────────────────────────────
/** Bet coin icon size */
export const PANEL_BET_COIN_SIZE = 18;
/** Bet coin x position */
export const PANEL_BET_COIN_X = 22;
/** Bet amount x position */
export const PANEL_BET_AMT_X = 38;
/** Bet amount font size */
export const PANEL_BET_AMT_FONT = 18;
/** Bet label y position */
export const PANEL_BET_LBL_Y = 12;
/** Bet bottom row y offset from card bottom */
export const PANEL_BET_BOT_OFFSET = 30;
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

// ─── Mobile Panel — Total Profit Card ───────────────────────────────
/** Total Profit card text x offset */
export const PANEL_PROFIT_INNER_PX = 38;
/** Profit label y position */
export const PANEL_PROFIT_LBL_Y = 14;
/** Profit multiplier gap after label */
export const PANEL_PROFIT_MULT_GAP = 5;
/** Profit amount font size */
export const PANEL_PROFIT_AMT_FONT = 15;
/** Profit bottom row y offset from card bottom */
export const PANEL_PROFIT_BOT_OFFSET = 30;
/** Profit coin gap after amount */
export const PANEL_PROFIT_COIN_GAP = 10;

// ─── Mobile Panel — Play Button ─────────────────────────────────────
/** Play button circle radius */
export const PLAY_R = 57;
/** Play button y-offset adjustment */
export const PLAY_BTN_Y_OFFSET = 25;
/** Play button label font size */
export const PLAY_LABEL_FONT = 14;
/** Play button amount font size */
export const PLAY_AMT_FONT = 18;
/** Play button coin icon size */
export const PLAY_COIN_SIZE = 22;

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
/** Pop-out animation speed */
export const RESULT_POP_SPEED = 0.045;
/** Auto-dismiss delay (ms) */
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

// ─── Animation ──────────────────────────────────────────────────────
/** Frames between ambient ember spawns */
export const EMBER_SPAWN_INTERVAL = 8;
/** Ember particle spawn Y offset from bottom */
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

// ─── Screen Shake ───────────────────────────────────────────────────
/** Maximum number of shake frames */
export const SHAKE_MAX_FRAMES = 16;
/** Shake displacement intensity (pixels) */
export const SHAKE_INTENSITY = 10;

// ─── Multiplier Display ─────────────────────────────────────────────
/** Multiplier display card width */
export const MULT_DISPLAY_W = 150;
/** Multiplier display card height */
export const MULT_DISPLAY_H = 64;
/** Multiplier display card corner radius */
export const MULT_DISPLAY_RADIUS = 14;
/** Multiplier display text font size */
export const MULT_DISPLAY_FONT_SIZE = 40;
/** Multiplier display y-position factor */
export const MULT_DISPLAY_Y_FACTOR = 0.32;

// ─── Vignette ───────────────────────────────────────────────────────
/** Vignette gradient stop positions as fractions of CH */
export const VIGNETTE_STOPS = [0.58, 0.42, 0.15] as const;
