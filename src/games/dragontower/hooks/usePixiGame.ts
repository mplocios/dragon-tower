import { useEffect, useRef, useCallback } from 'react';
import * as PIXI from 'pixi.js';
import { Difficulty, GameState, TileContent, TileState } from '../types';
import { useGameStore } from '../store/useGameStore';
import { CW, CH, CH_MOBILE, PANEL_H, PAD, PAD_MOBILE, TGAP, RGAP, WALL_H, DIFF, MULTS, REF_COLS, DESKTOP_SCALE,
  GRID_TOP_RESERVE, TILE_ASPECT_RATIO, TILE_ASPECT_RATIO_MOBILE, GRID_BOTTOM_MARGIN, GRID_LAYER_Y,
  DRAGON_NORMAL_MAX_W, DRAGON_NORMAL_MAX_H, DRAGON_FIRE_MAX_W, DRAGON_FIRE_MAX_H,
  WALL_OVERSHOOT_W, WALL_OVERSHOOT_H, WALL_OFFSET_X, WALL_OFFSET_Y,
  DRAGON_BREATH_AMPLITUDE, DRAGON_BREATH_FREQ, DRAGON_Y_OFFSET,
  DRAGON_GLOW_RADII, DRAGON_GLOW_X_OFFSET, DRAGON_GLOW_Y_OFFSET, DRAGON_GLOW_COLORS, DRAGON_GLOW_ALPHAS,
  DRAGON_GLOW_STEPS, DRAGON_GLOW_GRADIENT_COLOR, DRAGON_GLOW_ALPHA_MIN, DRAGON_GLOW_ALPHA_MAX,
  EGG_SCALE_W, EGG_SCALE_H, EGG_Y_OFFSET, DRAGON_ICON_SCALE_W, DRAGON_ICON_SCALE_H,
  DRAGON_ICON_Y_OFFSET, DRAGON_ICON_FLOAT_SPEED, DRAGON_ICON_FLOAT_AMP, DRAGON_ICON_ALPHA, DRAGON_ICON_TINT,
  DRAGON_SHADOW_W, DRAGON_SHADOW_H, DRAGON_SHADOW_Y, DRAGON_SHADOW_ALPHA,
  DRAGON_SPRITE_FRAMES, DRAGON_SPRITE_SPEED,
  TOP_FLAME_W_EXT, TOP_FLAME_H, TOP_FLAME_Y_ANCHOR,
  TOP_LIGHTING_W_EXT, TOP_LIGHTING_H_EXT, TOP_LIGHTING_Y_OFFSET,
  FLAME_BORDER_W, FLAME_BORDER_LEFT_OFFSET, FLAME_BORDER_RIGHT_OFFSET, FLAME_BORDER_Y_OFFSET,
  MOBILE_BREAKPOINT, PANEL_PX, PANEL_PY, PANEL_DIFF_H, PANEL_MID_H, PANEL_BOT_H,
  PANEL_ROW_GAP, PANEL_MID_GAP, PANEL_BOT_GAP, PANEL_Y_OFFSET,
  PANEL_LBL_COLOR, PANEL_GOLD_COLOR, PLAY_R, PLAY_BTN_Y_OFFSET, PLAY_LABEL_FONT, PLAY_AMT_FONT, PLAY_COIN_SIZE,
  PANEL_LBL_FONT, PANEL_AMT_FONT, PANEL_INNER_PX, PANEL_CARD_RADIUS, PANEL_CARD_BG,
  PANEL_DIFF_RIGHT, PANEL_BAL_AMT_X, PANEL_COIN_SIZE, PANEL_COIN_GAP,
  PANEL_BET_COIN_SIZE, PANEL_BET_COIN_X, PANEL_BET_AMT_X, PANEL_BET_AMT_FONT,
  PANEL_BET_LBL_Y, PANEL_BET_BOT_OFFSET,
  PANEL_ARROW_UP_W, PANEL_ARROW_UP_H, PANEL_ARROW_DOWN_W, PANEL_ARROW_DOWN_H, PANEL_ARROW_RIGHT, PANEL_ARROW_UP_Y, PANEL_ARROW_DOWN_Y,
  PANEL_PROFIT_LBL_Y, PANEL_PROFIT_MULT_GAP, PANEL_PROFIT_AMT_FONT, PANEL_PROFIT_BOT_OFFSET, PANEL_PROFIT_COIN_GAP,
  PANEL_RANDOM_INNER_PX, PANEL_PROFIT_INNER_PX,
} from '../constants';

interface TileObj {
  root: PIXI.Container;
  bg: PIXI.Graphics;
  tsprite: PIXI.Container;
  ttex: PIXI.TilingSprite | null;
  icons: PIXI.Container;
  hit: PIXI.Graphics;
  w: number;
  h: number;
}

interface TileObjRow extends Array<TileObj> {
  _ml?: PIXI.Text;
}

interface UsePixiGameOptions {
  onTileClick: (r: number, c: number) => void;
  onPlayAgain: () => void;
  getState: () => {
    gstate: GameState;
    curRow: number;
    diff: Difficulty;
    revealed: Record<number, Record<number, TileContent>>;
  };
  onBetChange?: (v: number) => void;
  onDiffChange?: (v: Difficulty) => void;
  onPlayAction?: () => void;
  onRandom?: () => void;
}

export function usePixiGame(
  canvasWrapRef: React.RefObject<HTMLDivElement>,
  options: UsePixiGameOptions
) {
  const appRef = useRef<PIXI.Application | null>(null);
  const bgLayerRef = useRef<PIXI.Container | null>(null);
  const gridLayerRef = useRef<PIXI.Container | null>(null);
  const fxLayerRef = useRef<PIXI.Container | null>(null);
  const uiLayerRef = useRef<PIXI.Container | null>(null);
  const tileObjsRef = useRef<TileObjRow[]>([]);
  const particlesRef = useRef<PIXI.Graphics[]>([]);
  const texRef = useRef<Record<string, PIXI.Texture>>({});
  const dragonGifBufRef = useRef<ArrayBuffer | null>(null);
  const dragonFramesRef = useRef<PIXI.Texture[]>([]);
  const resultOverlayRef = useRef<PIXI.Container | null>(null);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flameBorderLeftRef = useRef<PIXI.Sprite | null>(null);
  const flameBorderRightRef = useRef<PIXI.Sprite | null>(null);
  const topFlameBgRef = useRef<PIXI.Sprite | null>(null);
  const glowTopRef = useRef<PIXI.Graphics | null>(null);
  const glowBottomRef = useRef<PIXI.Graphics | null>(null);
  const checkoutSoundRef = useRef<HTMLAudioElement | null>(null);
  const bgSoundRef = useRef<HTMLAudioElement | null>(null);
  const normalBgSoundRef = useRef<HTMLAudioElement | null>(null);
  const loseSoundRef = useRef<HTMLAudioElement | null>(null);
  const brickSoundRef = useRef<HTMLAudioElement | null>(null);
  const eggSoundRef = useRef<HTMLAudioElement | null>(null);
  const soundCacheRef = useRef<Record<string, HTMLAudioElement>>({});

  const multDisplayRef = useRef<PIXI.Container | null>(null);
  const multFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frameRef = useRef(0);
  const dragonBaseScaleRef = useRef(1);
  const revealedSetRef = useRef<Set<string>>(new Set());
  const tileAnimsRef = useRef<{ root: PIXI.Container; progress: number }[]>([]);
  const activeTickersRef = useRef<Set<(...args: any[]) => void>>(new Set());
  const activeTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  // ── Mobile Panel refs ──
  const panelLayerRef = useRef<PIXI.Container | null>(null);
  const isMobileRef = useRef(typeof window !== 'undefined' && window.innerWidth <= 767);
  const panelTextsRef = useRef<Record<string, any>>({});
  const panelCooldownRef = useRef(false);
  const dragonGlowRef = useRef<PIXI.Graphics | null>(null);
  const stoneBgRef = useRef<PIXI.Container | null>(null);

  const onTileClickRef = useRef(options.onTileClick);
  const onPlayAgainRef = useRef(options.onPlayAgain);
  const getStateRef = useRef(options.getState);
  const onBetChangeRef = useRef(options.onBetChange);
  const onDiffChangeRef = useRef(options.onDiffChange);
  const onPlayActionRef = useRef(options.onPlayAction);
  const onRandomRef = useRef(options.onRandom);
  useEffect(() => { onTileClickRef.current = options.onTileClick; }, [options.onTileClick]);
  useEffect(() => { onPlayAgainRef.current = options.onPlayAgain; }, [options.onPlayAgain]);
  useEffect(() => { getStateRef.current = options.getState; }, [options.getState]);
  useEffect(() => { onBetChangeRef.current = options.onBetChange; }, [options.onBetChange]);
  useEffect(() => { onDiffChangeRef.current = options.onDiffChange; }, [options.onDiffChange]);
  useEffect(() => { onPlayActionRef.current = options.onPlayAction; }, [options.onPlayAction]);
  useEffect(() => { onRandomRef.current = options.onRandom; }, [options.onRandom]);

  // ─── Helpers ────────────────────────────────────────────────
  const calcLayout = useCallback((diff: Difficulty) => {
    const cfg = DIFF[diff];
    const hPad = isMobileRef.current ? PAD_MOBILE : PAD;
    const fullGridW = CW - hPad * 2;
    // Fixed grid width based on REF_COLS (Medium = 3)
    const refTileW = (fullGridW - TGAP * (REF_COLS - 1)) / REF_COLS;
    const fixedGridW = REF_COLS * refTileW + (REF_COLS - 1) * TGAP;
    // Tile width adapts to fit actual cols within fixed grid width
    const tileW = (fixedGridW - TGAP * (cfg.cols - 1)) / cfg.cols;
    // Tile height stays constant (based on ref tile size, smaller on mobile)
    const aspectRatio = isMobileRef.current ? TILE_ASPECT_RATIO_MOBILE : TILE_ASPECT_RATIO;
    const maxH = (CH - GRID_TOP_RESERVE - RGAP * (cfg.rows - 1)) / cfg.rows;
    const tileH = Math.min(refTileW * aspectRatio, maxH);
    const gridH = cfg.rows * tileH + (cfg.rows - 1) * RGAP;
    const gridY = CH - gridH - GRID_BOTTOM_MARGIN;
    // Center tiles within canvas
    const actualW = cfg.cols * tileW + (cfg.cols - 1) * TGAP;
    const offsetX = (fullGridW - actualW) / 2;
    return { cols: cfg.cols, rows: cfg.rows, tileW, tileH, gridH, gridY, offsetX, hPad };
  }, []);

  const setTileSprite = useCallback((container: PIXI.Container, tex: PIXI.Texture | null, w: number, h: number) => {
    container.removeChildren();
    if (!tex) return;
    const sp = new PIXI.Sprite(tex);
    sp.width = w; sp.height = h; sp.x = 0; sp.y = 0;
    container.addChild(sp);
  }, []);

  const paintBg = useCallback((
    g: PIXI.Graphics,
    ts: PIXI.Container,
    ttex: PIXI.TilingSprite | null,
    w: number,
    h: number,
    state: TileState
  ) => {
    const TEX = texRef.current;
    g.clear();
    const R = 6;
    if (state === 'active' || state === 'hover') {
      if (state === 'hover') {
        g.roundRect(-3, -3, w + 6, h + 6, R + 3).fill({ color: 0xbbee00, alpha: 0.2 });
      } else {
        g.roundRect(-2, -2, w + 4, h + 4, R + 2).fill({ color: 0x88cc00, alpha: 0.12 });
      }
      setTileSprite(ts, TEX.tile_green ?? null, w, h);
      if (ts.children[0]) (ts.children[0] as PIXI.Sprite).alpha = state === 'hover' ? 1 : 0.92;
      if (ttex) ttex.alpha = 0;
    } else if (state === 'idle' || state === 'inactive') {
      setTileSprite(ts, TEX.tile_dark ?? null, w, h);
      if (ttex) ttex.alpha = 0;
    } else if (state === 'egg' || state === 'egg_dim') {
      setTileSprite(ts, null, w, h);
      g.roundRect(1, 2, w, h, R).fill({ color: 0x000000, alpha: 0.6 });
      g.roundRect(0, 0, w, h, R).fill({ color: 0x080808 });
      if (ttex) ttex.alpha = 0;
      if (state === 'egg') {
        g.roundRect(-2, -2, w + 4, h + 4, R + 2).fill({ color: 0xf0a020, alpha: 0.08 });
        g.roundRect(0, 0, w, h, R).stroke({ width: 2, color: 0xf0a020, alpha: 1 });
      } else {
        g.roundRect(0, 0, w, h, R).stroke({ width: 2, color: 0x222222, alpha: 0.9 });
      }
    } else if (state === 'dragon') {
      setTileSprite(ts, null, w, h);
      const DR = 2.56;
      // Linear gradient 90deg: dark red edges → black center → dark red edges
      const grad = new PIXI.FillGradient({
        type: 'linear',
        start: { x: 0, y: 0.5 },
        end: { x: 1, y: 0.5 },
        textureSpace: 'local',
        colorStops: [
          { offset: 0, color: '#4C0C0C' },
          { offset: 0.35, color: '#1a0303' },
          { offset: 0.5, color: '#000000' },
          { offset: 0.65, color: '#1a0303' },
          { offset: 1, color: '#4C0C0C' },
        ],
      });
      g.roundRect(0, 0, w, h, DR).fill(grad);
      if (ttex) ttex.alpha = 0;
      // Stroke: #9F1616, inside, weight 0.85
      g.roundRect(0.42, 0.42, w - 0.85, h - 0.85, DR).stroke({ width: 0.85, color: 0x9F1616 });
    }
  }, [setTileSprite]);

  const setIcon = useCallback((tile: TileObj, type: TileContent, animate?: boolean) => {
    const TEX = texRef.current;
    tile.icons.removeChildren();
    const { w, h } = tile;
    if (type === 'egg') {
      if (TEX.egg) {
        const sp = new PIXI.Sprite(TEX.egg);
        const sc = Math.min((w * EGG_SCALE_W) / sp.texture.width, (h * EGG_SCALE_H) / sp.texture.height);
        sp.scale.set(sc); sp.anchor.set(0.5); sp.x = w / 2; sp.y = h / 2 + EGG_Y_OFFSET;
        tile.icons.addChild(sp);
      }
      tile.root.alpha = 1;
      tile.root.zIndex = 5;
      if (animate) {
        tile.root.scale.set(0.4);
        tileAnimsRef.current.push({ root: tile.root, progress: 0 });
      }
    } else if (type === 'egg_dim') {
      if (TEX.egg) {
        const sp = new PIXI.Sprite(TEX.egg);
        const sc = Math.min((w * EGG_SCALE_W) / sp.texture.width, (h * EGG_SCALE_H) / sp.texture.height);
        sp.scale.set(sc); sp.anchor.set(0.5); sp.x = w / 2; sp.y = h / 2 + EGG_Y_OFFSET;
        tile.icons.addChild(sp);
      }
      tile.root.alpha = 0.5;
      tile.root.zIndex = 5;
    } else if (type === 'dragon') {
      const frames = dragonFramesRef.current;
      if (frames.length > 0) {
        // Shadow ellipse (behind the icon)
        const shadow = new PIXI.Graphics();
        const shadowW = w * DRAGON_SHADOW_W;
        const shadowH = h * DRAGON_SHADOW_H;
        shadow.ellipse(0, 0, shadowW, shadowH).fill({ color: 0xffffff, alpha: DRAGON_SHADOW_ALPHA });
        shadow.x = w / 2; shadow.y = h / 2 + h * DRAGON_SHADOW_Y;
        shadow.tint = 0x660808;
        shadow.label = 'dragonShadow';
        (shadow as any)._baseScaleX = shadow.scale.x;
        (shadow as any)._baseScaleY = shadow.scale.y;
        tile.icons.addChild(shadow);

        // Animated sprite icon
        const sp = new PIXI.AnimatedSprite(frames);
        sp.animationSpeed = DRAGON_SPRITE_SPEED;
        sp.loop = true;
        sp.play();
        const targetW = w * DRAGON_ICON_SCALE_W;
        const targetH = h * DRAGON_ICON_SCALE_H;
        const sc = Math.min(targetW / frames[0].width, targetH / frames[0].height);
        sp.scale.set(sc); sp.anchor.set(0.5); sp.x = w / 2; sp.y = h / 2 + DRAGON_ICON_Y_OFFSET;
        sp.alpha = DRAGON_ICON_ALPHA;
        sp.tint = DRAGON_ICON_TINT;
        sp.label = 'dragonIcon';
        (sp as any)._baseY = sp.y;
        (sp as any)._floatOffset = Math.random() * Math.PI * 2;
        tile.icons.addChild(sp);
      }
      tile.root.zIndex = 10;
      tile.root.alpha = 1;
      if (animate) {
        tile.root.scale.set(0.4);
        tileAnimsRef.current.push({ root: tile.root, progress: 0 });
      }
    }
  }, []);

  // ─── Stone Background ──────────────────────────────────────
  const buildStoneBackground = useCallback((fx: number, fy: number, fw: number, fh: number) => {
    const gridLayer = gridLayerRef.current;
    if (!gridLayer) return;

    // Remove previous stone background
    if (stoneBgRef.current) {
      gridLayer.removeChild(stoneBgRef.current);
      stoneBgRef.current.destroy({ children: true });
      stoneBgRef.current = null;
    }

    const container = new PIXI.Container();
    const g = new PIXI.Graphics();
    const rng = () => Math.random();

    // Solid dark stone base
    g.rect(fx, fy, fw, fh).fill({ color: 0x141418 });

    // Scattered noise for rough stone texture
    for (let i = 0; i < 1200; i++) {
      const dx = fx + rng() * fw;
      const dy = fy + rng() * fh;
      const bright = rng() > 0.4;
      const shade = bright
        ? 0x1a + Math.floor(rng() * 16)
        : 0x08 + Math.floor(rng() * 8);
      const color = (shade << 16) | (shade << 8) | shade;
      const size = 1 + Math.floor(rng() * 2);
      g.rect(dx, dy, size, size).fill({ color, alpha: 0.15 + rng() * 0.35 });
    }

    // Subtle large blotches for uneven stone surface
    for (let i = 0; i < 30; i++) {
      const bx = fx + rng() * (fw - 40);
      const by = fy + rng() * (fh - 30);
      const bw = 15 + rng() * 40;
      const bh = 10 + rng() * 30;
      const dark = rng() > 0.5;
      const shade = dark ? 0x0a : 0x1c;
      const color = (shade << 16) | (shade << 8) | shade;
      g.rect(bx, by, bw, bh).fill({ color, alpha: 0.06 + rng() * 0.1 });
    }

    container.addChild(g);

    // Clip to frame bounds
    const mask = new PIXI.Graphics();
    mask.rect(fx, fy, fw, fh).fill({ color: 0xffffff });
    container.addChild(mask);
    container.mask = mask;

    container.zIndex = -1;
    gridLayer.addChild(container);
    stoneBgRef.current = container;
  }, []);

  // ─── Draw Frame ─────────────────────────────────────────────
  const drawFrame = useCallback((L: ReturnType<typeof calcLayout>) => {
    const TEX = texRef.current;
    const gridLayer = gridLayerRef.current!;
    const fx = L.hPad - 13, fy = L.gridY - 13;
    const fw = CW - fx - (L.hPad - 13), fh = L.gridH + 26, wcy = fy - WALL_H;
    // Stone background inside the tower frame
    buildStoneBackground(fx, fy, fw, fh);

    if (TEX.tower_border) {
      const border = new PIXI.Sprite(TEX.tower_border);
      border.width = fw; border.height = fh;
      border.x = fx; border.y = fy;
      gridLayer.addChild(border);
    } else {
      const g = new PIXI.Graphics();
      g.roundRect(fx, fy, fw, fh, 0).fill({ color: 0x4f4f51 });
      for (let y = fy + 20; y < fy + fh - 5; y += 20) {
        g.moveTo(fx + 6, y).lineTo(fx + fw - 6, y);
      }
      for (let r2 = 0; r2 * 20 < fh; r2++) {
        const yy = fy + r2 * 20, off = (r2 % 2) * 24;
        for (let x = fx + off; x < fx + fw; x += 48) {
          g.moveTo(x, yy).lineTo(x, Math.min(yy + 20, fy + fh));
        }
      }
      g.stroke({ width: 1.5, color: 0x4f4f51, alpha: 0.85 });
      g.roundRect(fx + 9, fy + 9, fw - 18, fh - 18, 0).fill({ color: 0x060c18, alpha: 0.75 });
      g.roundRect(fx, fy, fw, fh, 0).stroke({ width: 1, color: 0x48402e, alpha: 0.25 });
      gridLayer.addChild(g);
    }

    // ── Fire glow overlays on left & right borders ──────────────
    const glowG = new PIXI.Graphics();
    // Left glow strip
    glowG.rect(fx - 6, fy, 12, fh).fill({ color: 0xff4400, alpha: 0.06 });
    glowG.rect(fx - 3, fy, 6, fh).fill({ color: 0xff6600, alpha: 0.08 });
    // Right glow strip
    glowG.rect(fx + fw - 6, fy, 12, fh).fill({ color: 0xff4400, alpha: 0.06 });
    glowG.rect(fx + fw - 3, fy, 6, fh).fill({ color: 0xff6600, alpha: 0.08 });
    // Bottom glow
    glowG.rect(fx, fy + fh - 4, fw, 8).fill({ color: 0xff5500, alpha: 0.05 });
    gridLayer.addChild(glowG);

    if (TEX.wall) {
      const wt = new PIXI.Sprite(TEX.wall);
      wt.width = fw + WALL_OVERSHOOT_W; wt.height = WALL_H + WALL_OVERSHOOT_H;
      wt.x = fx - WALL_OFFSET_X; wt.y = wcy + WALL_OFFSET_Y; wt.alpha = 1;
      gridLayer.addChild(wt);
    }

    // ── Top flame background — BEHIND dragon (shown on win/cashout) ──
    if (TEX.top_flame_bg) {
      const topFlame = new PIXI.Sprite(TEX.top_flame_bg);
      const topFlameW = fw + TOP_FLAME_W_EXT;
      const topFlameH = TOP_FLAME_H;
      topFlame.width = topFlameW; topFlame.height = topFlameH;
      topFlame.anchor.set(0.5, 1);
      topFlame.x = CW / 2; topFlame.y = wcy + TOP_FLAME_Y_ANCHOR;
      topFlame.alpha = 0; topFlame.visible = false;
      topFlame.label = 'topFlameBg';
      gridLayer.addChild(topFlame);
      topFlameBgRef.current = topFlame;
    }

    // Dragon — ABOVE top flame bg
    const dTex = TEX.dragon_normal ?? TEX.dragon_small;
    if (dTex) {
      const ds = new PIXI.Sprite(dTex);
      const sc = Math.min(DRAGON_NORMAL_MAX_W / ds.texture.width, DRAGON_NORMAL_MAX_H / ds.texture.height);
      ds.scale.set(sc); ds.anchor.set(0.5, 1); ds.x = CW / 2; ds.y = wcy + DRAGON_Y_OFFSET;
      ds.label = 'wallDragon';
      ds.zIndex = 20;
      dragonBaseScaleRef.current = sc;
      gridLayer.addChild(ds);
    }

    // Dragon glow — smooth radial gradient, IN FRONT of dragon
    const dragonGlow = new PIXI.Graphics();
    const glowX = CW / 2 + DRAGON_GLOW_X_OFFSET, glowY = wcy + DRAGON_GLOW_Y_OFFSET;
    const maxR = DRAGON_GLOW_RADII[0];
    for (let i = 0; i < DRAGON_GLOW_STEPS; i++) {
      const t = i / (DRAGON_GLOW_STEPS - 1); // 0 = outer, 1 = inner
      const r = maxR * (1 - t);
      const a = DRAGON_GLOW_ALPHA_MIN + t * DRAGON_GLOW_ALPHA_MAX;
      dragonGlow.circle(glowX, glowY, r).fill({ color: DRAGON_GLOW_GRADIENT_COLOR, alpha: a });
    }
    dragonGlow.label = 'dragonGlow';
    dragonGlow.zIndex = 21;
    gridLayer.addChild(dragonGlow);
    dragonGlowRef.current = dragonGlow;

    // ── Top lighting — below dragon, in front of everything ──
    if (TEX.top_lighting) {
      const topLight = new PIXI.Sprite(TEX.top_lighting);
      topLight.anchor.set(0.5, 0.5);
      topLight.x = CW / 2;
      topLight.y = wcy + WALL_H / 2 + TOP_LIGHTING_Y_OFFSET;
      topLight.width = fw + TOP_LIGHTING_W_EXT;
      topLight.height = WALL_H + TOP_LIGHTING_H_EXT;
      topLight.zIndex = 50;
      topLight.blendMode = 'add';
      topLight.label = 'topLighting';
      gridLayer.addChild(topLight);
    }

    if (TEX.wall_bottom) {
      const wb = new PIXI.Sprite(TEX.wall_bottom);
      const wbH = 76;
      wb.width = fw + 36; wb.height = wbH;
      wb.x = fx - 18; wb.y = fy + fh - wbH / 2 + 15;
      wb.alpha = 1;
      gridLayer.addChild(wb);
    }

    // ── Top glow (around dragon area) — shown on win/cashout ──
    const glowTop = new PIXI.Graphics();
    glowTop.rect(fx - 20, wcy - 10, fw + 40, WALL_H + 40).fill({ color: 0xff6600, alpha: 0.12 });
    glowTop.rect(fx - 10, wcy, fw + 20, WALL_H + 20).fill({ color: 0xff8800, alpha: 0.08 });
    glowTop.alpha = 0; glowTop.visible = false;
    glowTop.label = 'glowTop';
    gridLayer.addChild(glowTop);
    glowTopRef.current = glowTop;

    // ── Bottom glow (below tower) — shown on win/cashout ──
    const glowBottom = new PIXI.Graphics();
    glowBottom.rect(fx - 10, fy + fh - 8, fw + 20, 30).fill({ color: 0xff5500, alpha: 0.15 });
    glowBottom.rect(fx, fy + fh - 4, fw, 18).fill({ color: 0xff7700, alpha: 0.1 });
    glowBottom.alpha = 0; glowBottom.visible = false;
    glowBottom.label = 'glowBottom';
    gridLayer.addChild(glowBottom);
    glowBottomRef.current = glowBottom;

    // ── Flame border sprites ──
    flameBorderLeftRef.current = null;
    flameBorderRightRef.current = null;
    if (TEX.flame_border) {
      const fbW = FLAME_BORDER_W;
      const fbH = fh + 20;

      // Left flame border — no flip, fire points right (into tower)
      const left = new PIXI.Sprite(TEX.flame_border);
      left.width = fbW;
      left.height = fbH;
      left.x = fx - fbW + FLAME_BORDER_LEFT_OFFSET;
      left.y = fy - FLAME_BORDER_Y_OFFSET;
      left.alpha = 0;
      left.visible = false;
      flameBorderLeftRef.current = left;

      // Right flame border — flipped, fire points left (into tower)
      const right = new PIXI.Sprite(TEX.flame_border);
      right.width = fbW;
      right.height = fbH;
      right.scale.x = -Math.abs(right.scale.x); // flip while keeping calculated scale
      right.x = fx + fw + FLAME_BORDER_RIGHT_OFFSET;
      right.y = fy - FLAME_BORDER_Y_OFFSET;
      right.alpha = 0;
      right.visible = false;
      flameBorderRightRef.current = right;
    }
  }, [calcLayout, buildStoneBackground]);

  // ─── Make Tile ──────────────────────────────────────────────
  const makeTile = useCallback((
    r: number, c: number,
    x: number, y: number,
    w: number, h: number
  ): TileObj => {
    const TEX = texRef.current;
    const root = new PIXI.Container(); root.x = x; root.y = y;
    const bg = new PIXI.Graphics(); root.addChild(bg);
    const tsprite = new PIXI.Container(); root.addChild(tsprite);
    let ttex: PIXI.TilingSprite | null = null;
    if (TEX.tile_tex) {
      ttex = new PIXI.TilingSprite({ texture: TEX.tile_tex, width: w, height: h });
      ttex.alpha = 0; root.addChild(ttex);
    }
    const icons = new PIXI.Container(); root.addChild(icons);
    const hit = new PIXI.Graphics();
    hit.roundRect(0, 0, w, h, 6).fill({ color: 0xffffff, alpha: 0.001 });
    hit.eventMode = 'static'; hit.cursor = 'pointer';

    hit.on('pointerdown', () => onTileClickRef.current(r, c));
    hit.on('pointerover', () => {
      const st = getStateRef.current();
      if (st.gstate === 'playing' && st.curRow === r && !(st.revealed[r] ?? {})[c]) {
        paintBg(bg, tsprite, ttex, w, h, 'hover');
      }
    });
    hit.on('pointerout', () => {
      const st = getStateRef.current();
      if (st.gstate === 'playing' && st.curRow === r && !(st.revealed[r] ?? {})[c]) {
        paintBg(bg, tsprite, ttex, w, h, 'active');
      }
    });

    root.addChild(hit);
    paintBg(bg, tsprite, ttex, w, h, 'idle');
    return { root, bg, tsprite, ttex, icons, hit, w, h };
  }, [paintBg]);

  // ─── Build Grid ─────────────────────────────────────────────
  const buildGrid = useCallback((diff: Difficulty) => {
    const gridLayer = gridLayerRef.current;
    if (!gridLayer) return;
    gridLayer.removeChildren();
    tileObjsRef.current = [];
    revealedSetRef.current.clear();
    tileAnimsRef.current = [];

    if (multDisplayRef.current) {
      const uiLayer = uiLayerRef.current;
      if (uiLayer) uiLayer.removeChild(multDisplayRef.current);
      multDisplayRef.current.destroy({ children: true });
      multDisplayRef.current = null;
    }

    const L = calcLayout(diff);
    drawFrame(L);
    for (let r = 0; r < L.rows; r++) {
      const row: TileObjRow = [];
      const vRow = L.rows - 1 - r;
      const rowY = L.gridY + vRow * (L.tileH + RGAP);
      for (let c = 0; c < L.cols; c++) {
        const tile = makeTile(r, c, L.hPad + L.offsetX + c * (L.tileW + TGAP), rowY, L.tileW, L.tileH);
        row[c] = tile;
        gridLayer.addChild(tile.root);
      }
      const ml = new PIXI.Text({ text: '', style: { fontFamily: 'Rajdhani', fontSize: 10, fill: 0x1a3050, fontWeight: '700' } });
      ml.anchor.set(0, 0.5); ml.x = CW - L.hPad + 5; ml.y = rowY + L.tileH / 2;
      gridLayer.addChild(ml);
      row._ml = ml;
      tileObjsRef.current[r] = row;
    }

    // ── Add flame borders to uiLayer (topmost layer, above everything) ──
    const uiL = uiLayerRef.current;
    if (uiL) {
      // Remove old flame borders from uiLayer
      for (let i = uiL.children.length - 1; i >= 0; i--) {
        const ch = uiL.children[i];
        if (ch.label === 'flameBorderLeft' || ch.label === 'flameBorderRight') {
          uiL.removeChild(ch);
          ch.destroy();
        }
      }
      if (flameBorderLeftRef.current) {
        flameBorderLeftRef.current.label = 'flameBorderLeft';
        uiL.addChild(flameBorderLeftRef.current);
      }
      if (flameBorderRightRef.current) {
        flameBorderRightRef.current.label = 'flameBorderRight';
        uiL.addChild(flameBorderRightRef.current);
      }
    }
  }, [calcLayout, drawFrame, makeTile]);

  // ─── Refresh Grid ────────────────────────────────────────────
  const refreshGrid = useCallback((
    diff: Difficulty,
    gstate: GameState,
    curRow: number,
    revealed: Record<number, Record<number, TileContent>>
  ) => {
    const tileObjs = tileObjsRef.current;
    const mults = MULTS[diff];
    for (let r = 0; r < tileObjs.length; r++) {
      if (!tileObjs[r]) continue;
      const isCur = gstate === 'playing' && r === curRow;
      const isPast = gstate === 'playing' && r < curRow;
      const revRow = revealed[r] ?? {};
      const ml = tileObjs[r]._ml;
      if (ml) {
        ml.visible = false;
      }
      for (let c = 0; c < tileObjs[r].length; c++) {
        const tile = tileObjs[r][c];
        if (!tile) continue;
        const rv = revRow[c] ?? null;
        let state: TileState = rv
          ? (rv as TileState)
          : gstate === 'idle'
          ? 'idle'
          : isCur
          ? 'active'
          : isPast
          ? 'idle'
          : 'inactive';
        paintBg(tile.bg, tile.tsprite, tile.ttex, tile.w, tile.h, state);
        const clickable = gstate === 'playing' && isCur && !rv;
        tile.hit.eventMode = clickable ? 'static' : 'none';
        tile.hit.cursor = clickable ? 'pointer' : 'default';
        if (rv) {
          const key = `${r},${c}`;
          const isNew = !revealedSetRef.current.has(key);
          if (isNew) revealedSetRef.current.add(key);
          setIcon(tile, rv, isNew);
        }
        else {
          tile.icons.removeChildren();
          tile.root.alpha = 1;
          tile.root.scale.set(1);
          if (tile.ttex) tile.ttex.alpha = 0;
        }
      }
    }

    // ── Multiplier display ──────────────────────────────────────
    const uiLayer = uiLayerRef.current;
    if (uiLayer) {
      if (gstate === 'playing' && curRow > 0) {
        const mult = mults[curRow - 1] ?? 1;
        if (!multDisplayRef.current) {
          const container = new PIXI.Container();
          const bg = new PIXI.Graphics();
          bg.roundRect(-75, -32, 150, 64, 14).fill({ color: 0x000000, alpha: 0.6 });
          bg.roundRect(-75, -32, 150, 64, 14).stroke({ width: 1.5, color: 0xc8a44a, alpha: 0.25 });
          container.addChild(bg);
          const text = new PIXI.Text({
            text: `${mult.toFixed(2)}x`,
            style: { fontFamily: 'Rajdhani', fontSize: 40, fontWeight: '900', fill: 0xe89010 },
          });
          text.anchor.set(0.5);
          container.addChild(text);
          const L = calcLayout(diff);
          container.x = CW / 2;
          container.y = L.gridY + L.gridH * 0.32;
          uiLayer.addChild(container);
          multDisplayRef.current = container;
        }
        const text = multDisplayRef.current.children[1] as PIXI.Text;
        if (text) text.text = `${mult.toFixed(2)}x`;
        multDisplayRef.current.visible = true;
        multDisplayRef.current.alpha = 0.95;
        multDisplayRef.current.scale.set(1.25);

        // Auto-fade after 3 seconds
        if (multFadeTimerRef.current) clearTimeout(multFadeTimerRef.current);
        const fadeTarget = multDisplayRef.current;
        multFadeTimerRef.current = setTimeout(() => {
          multFadeTimerRef.current = null;
          if (!fadeTarget || !fadeTarget.visible) return;
          // Start fade-out via ticker
          const fadeTicker = () => {
            fadeTarget.alpha -= 0.03;
            if (fadeTarget.alpha <= 0) {
              fadeTarget.visible = false;
              fadeTarget.alpha = 0;
              appRef.current?.ticker.remove(fadeTicker);
              activeTickersRef.current.delete(fadeTicker);
            }
          };
          appRef.current?.ticker.add(fadeTicker);
          activeTickersRef.current.add(fadeTicker);
        }, 3000);
        activeTimeoutsRef.current.add(multFadeTimerRef.current);
      } else {
        if (multDisplayRef.current) {
          multDisplayRef.current.visible = false;
        }
      }
    }
  }, [paintBg, setIcon, calcLayout]);

  // ─── Result Overlay ──────────────────────────────────────────
  const showResultOverlay = useCallback((type: 'win' | 'lose', mult: number, amount: number) => {
    const uiLayer = uiLayerRef.current;
    if (!uiLayer) return;

    if (multDisplayRef.current) multDisplayRef.current.visible = false;

    if (resultOverlayRef.current) {
      uiLayer.removeChild(resultOverlayRef.current);
      resultOverlayRef.current.destroy({ children: true });
      resultOverlayRef.current = null;
    }

    const TEX = texRef.current;
    const container = new PIXI.Container();

    const cardW = 170;
    const cardH = 150;
    const cardX = (CW - cardW) / 2;
    const cardY = (CH - cardH) / 2;

    if (TEX.result_bg) {
      const bg = new PIXI.Sprite(TEX.result_bg);
      bg.width = cardW; bg.height = cardH;
      bg.x = cardX; bg.y = cardY;
      container.addChild(bg);
    } else {
      const card = new PIXI.Graphics();
      card.roundRect(cardX, cardY, cardW, cardH, 14).fill({ color: 0x0d1828 });
      container.addChild(card);
    }

    const multText = new PIXI.Text({
      text: `${mult.toFixed(2)}x`,
      style: { fontFamily: 'Rajdhani', fontSize: 52, fontWeight: '900', fill: type === 'win' ? 0xe89010 : 0xcc3333 },
    });
    multText.anchor.set(0.5, 0);
    multText.x = CW / 2; multText.y = cardY + 16;
    container.addChild(multText);

    const div = new PIXI.Graphics();
    div.moveTo(cardX + 30, cardY + 82).lineTo(cardX + cardW - 30, cardY + 82).stroke({ width: 1, color: 0xb47810, alpha: 0.35 });
    container.addChild(div);

    const amtText = new PIXI.Text({
      text: `$${amount.toFixed(8)}`,
      style: { fontFamily: 'Rajdhani', fontSize: 13, fontWeight: '600', fill: 0xb0b8c4 },
    });
    amtText.anchor.set(0.5, 0);
    amtText.x = CW / 2 - 12; amtText.y = cardY + 92;
    container.addChild(amtText);

    const coinX = cardX + cardW - 28;
    const coinY = cardY + 92 + 10;
    if (TEX.gcoin) {
      const coin = new PIXI.Sprite(TEX.gcoin);
      coin.width = 20; coin.height = 20;
      coin.anchor.set(0.5);
      coin.x = coinX; coin.y = coinY;
      container.addChild(coin);
    }

    // Set pivot to center so scale animation pops from middle
    container.pivot.set(CW / 2, CH / 2);
    container.x = CW / 2;
    container.y = CH / 2;
    container.scale.set(0);
    container.alpha = 0;

    uiLayer.addChild(container);
    resultOverlayRef.current = container;

    // Pop-out animation from center
    let t = 0;
    const popTicker = () => {
      t += 0.045;
      if (t >= 1) {
        container.scale.set(1);
        container.alpha = 1;
        appRef.current?.ticker.remove(popTicker);
        activeTickersRef.current.delete(popTicker);
        return;
      }
      // Elastic overshoot ease
      const ease = t < 0.6
        ? (t / 0.6) * 1.15
        : 1.15 - 0.15 * ((t - 0.6) / 0.4);
      const s = Math.min(ease, 1.12);
      container.scale.set(s);
      container.alpha = Math.min(1, t * 2.5);
    };
    appRef.current?.ticker.add(popTicker);
    activeTickersRef.current.add(popTicker);

    if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    const tid = setTimeout(() => {
      resultTimerRef.current = null;
      activeTimeoutsRef.current.delete(tid);
      onPlayAgainRef.current();
    }, 7000);
    resultTimerRef.current = tid;
    activeTimeoutsRef.current.add(tid);
  }, []);

  const hideResultOverlay = useCallback(() => {
    const uiLayer = uiLayerRef.current;
    if (!uiLayer || !resultOverlayRef.current) return;
    uiLayer.removeChild(resultOverlayRef.current);
    resultOverlayRef.current.destroy({ children: true });
    resultOverlayRef.current = null;

    if (resultTimerRef.current) {
      clearTimeout(resultTimerRef.current);
      resultTimerRef.current = null;
    }
  }, []);

  // ─── Reset All Animation State ─────────────────────────────
  const resetAnimationState = useCallback(() => {
    const app = appRef.current;
    if (!app) return;

    // Remove all tracked ticker callbacks
    activeTickersRef.current.forEach((fn) => app.ticker.remove(fn));
    activeTickersRef.current.clear();

    // Clear all tracked timeouts
    activeTimeoutsRef.current.forEach((id) => clearTimeout(id));
    activeTimeoutsRef.current.clear();

    // Reset stage position (in case screenShake was interrupted)
    app.stage.x = 0;
    app.stage.y = 0;

    // Clear all particles
    const fxLayer = fxLayerRef.current;
    if (fxLayer) {
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        fxLayer.removeChild(particles[i]);
        particles[i].destroy();
      }
      particlesRef.current = [];
      // Remove any leftover flash overlays etc
      fxLayer.removeChildren();
    }

    // Clear tile entrance animations
    tileAnimsRef.current = [];

    // Hide result overlay
    hideResultOverlay();
  }, [hideResultOverlay]);

  // ─── Particles ───────────────────────────────────────────────
  const spawnFX = useCallback((
    r: number, c: number,
    type: 'fire' | 'sparkle',
    diff: Difficulty
  ) => {
    const fxLayer = fxLayerRef.current;
    if (!fxLayer) return;
    const L = calcLayout(diff);
    const cx = L.hPad + L.offsetX + c * (L.tileW + TGAP) + L.tileW / 2;
    const cy = L.gridY + (L.rows - 1 - r) * (L.tileH + RGAP) + L.tileH / 2 + GRID_LAYER_Y;
    const pal = type === 'fire'
      ? [0xff2200, 0xff5500, 0xff8800, 0xffbb00]
      : [0x20ff60, 0x14ff50, 0x88ffb8, 0x40ff80];
    const count = type === 'fire' ? 38 : 22;
    for (let i = 0; i < count; i++) {
      const pg = new PIXI.Graphics() as PIXI.Graphics & {
        _life: number; _decay: number; _vx: number; _vy: number;
      };
      pg.circle(0, 0, 2 + Math.random() * (type === 'fire' ? 7 : 4)).fill({ color: pal[i % pal.length], alpha: 0.94 });
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * (type === 'fire' ? Math.PI * 1.7 : Math.PI);
      const spd = (type === 'fire' ? 2.4 : 1.5) + Math.random() * 3.8;
      pg.x = cx + (Math.random() - 0.5) * 32;
      pg.y = cy + (Math.random() - 0.5) * 22;
      pg._vx = Math.cos(angle) * spd;
      pg._vy = Math.sin(angle) * spd;
      pg._life = 1; pg._decay = 0.014 + Math.random() * 0.026;
      fxLayer.addChild(pg);
      particlesRef.current.push(pg);
    }
  }, [calcLayout]);

  // ─── Win Celebration ────────────────────────────────────────
  const spawnWinCelebration = useCallback((diff: Difficulty) => {
    const fxLayer = fxLayerRef.current;
    if (!fxLayer) return;
    const L = calcLayout(diff);
    const sparkleColors = [0xffffff, 0xfffde7, 0xfff9c4, 0xffd700, 0x80d8ff, 0xffb800];
    const goldColors = [0xffd700, 0xffb800, 0xffa000, 0xffe44d];

    const addP = (x: number, y: number, vx: number, vy: number, col: number, size: number, alpha: number, decay: number) => {
      const pg = new PIXI.Graphics() as any;
      pg.circle(0, 0, size).fill({ color: col, alpha });
      pg.x = x; pg.y = y; pg._vx = vx; pg._vy = vy;
      pg._life = 1; pg._decay = decay;
      fxLayer.addChild(pg);
      particlesRef.current.push(pg);
    };

    // Helper: spawn a firework ring burst at (bx, by)
    const fireworkBurst = (bx: number, by: number, count: number, speed: number, colors: number[]) => {
      for (let i = 0; i < count; i++) {
        const col = colors[Math.floor(Math.random() * colors.length)];
        const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
        const spd = speed + Math.random() * 2;
        addP(bx, by, Math.cos(angle) * spd, Math.sin(angle) * spd,
          col, 2 + Math.random() * 3, 1, 0.01 + Math.random() * 0.012);
      }
      // Inner glow ring — smaller, brighter
      for (let i = 0; i < Math.floor(count * 0.5); i++) {
        const col = 0xffffff;
        const angle = (i / (count * 0.5)) * Math.PI * 2;
        const spd = speed * 0.5 + Math.random();
        addP(bx, by, Math.cos(angle) * spd, Math.sin(angle) * spd,
          col, 1 + Math.random() * 2, 1, 0.015 + Math.random() * 0.01);
      }
    };

    // ── WAVE 1: 5 firework bursts at staggered positions ──
    const positions = [
      { x: CW * 0.5, y: L.gridY + L.gridH * 0.15 },
      { x: CW * 0.2, y: L.gridY + L.gridH * 0.3 },
      { x: CW * 0.8, y: L.gridY + L.gridH * 0.3 },
      { x: CW * 0.35, y: L.gridY + L.gridH * 0.55 },
      { x: CW * 0.65, y: L.gridY + L.gridH * 0.55 },
    ];
    positions.forEach((p) => fireworkBurst(p.x, p.y, 24, 3.5, sparkleColors));

    // ── WAVE 2: Delayed secondary fireworks (300ms) ──
    const w2 = setTimeout(() => {
      activeTimeoutsRef.current.delete(w2);
      if (!fxLayerRef.current) return;
      const pos2 = [
        { x: CW * 0.15, y: L.gridY + L.gridH * 0.15 },
        { x: CW * 0.85, y: L.gridY + L.gridH * 0.15 },
        { x: CW * 0.5, y: L.gridY + L.gridH * 0.45 },
      ];
      pos2.forEach((p) => fireworkBurst(p.x, p.y, 30, 4, goldColors));
    }, 300);
    activeTimeoutsRef.current.add(w2);

    // ── WAVE 3: Final grand fireworks (650ms) ──
    const w3 = setTimeout(() => {
      activeTimeoutsRef.current.delete(w3);
      if (!fxLayerRef.current) return;
      const pos3 = [
        { x: CW * 0.3, y: L.gridY + L.gridH * 0.1 },
        { x: CW * 0.7, y: L.gridY + L.gridH * 0.1 },
        { x: CW * 0.5, y: L.gridY + L.gridH * 0.35 },
        { x: CW * 0.2, y: L.gridY + L.gridH * 0.6 },
        { x: CW * 0.8, y: L.gridY + L.gridH * 0.6 },
      ];
      pos3.forEach((p) => fireworkBurst(p.x, p.y, 28, 4.5, [...sparkleColors, ...goldColors]));
    }, 650);
    activeTimeoutsRef.current.add(w3);

    // Screen flash effect — brief golden overlay
    const flash = new PIXI.Graphics();
    flash.rect(0, 0, CW, CH).fill({ color: 0xffd700, alpha: 0.15 });
    fxLayer.addChild(flash);
    let flashLife = 1;
    const flashTicker = () => {
      flashLife -= 0.04;
      if (flashLife <= 0) {
        fxLayer.removeChild(flash);
        flash.destroy();
        appRef.current?.ticker.remove(flashTicker);
        activeTickersRef.current.delete(flashTicker);
        return;
      }
      flash.alpha = flashLife * 0.15;
    };
    appRef.current?.ticker.add(flashTicker);
    activeTickersRef.current.add(flashTicker);
  }, [calcLayout]);

  // ─── Lose Fire Explosion ────────────────────────────────────
  const spawnLoseExplosion = useCallback((r: number, c: number, diff: Difficulty) => {
    const fxLayer = fxLayerRef.current;
    if (!fxLayer) return;
    const L = calcLayout(diff);
    const cx = L.hPad + L.offsetX + c * (L.tileW + TGAP) + L.tileW / 2;
    const cy = L.gridY + (L.rows - 1 - r) * (L.tileH + RGAP) + L.tileH / 2 + GRID_LAYER_Y;
    const fireColors = [0xff0000, 0xff2200, 0xff4400, 0xff6600, 0xff8800, 0xcc0000];
    const emberColors = [0xff3300, 0xff5500, 0xff7700, 0xdd2200];

    const addP = (x: number, y: number, vx: number, vy: number, col: number, size: number, alpha: number, decay: number) => {
      const pg = new PIXI.Graphics() as any;
      pg.circle(0, 0, size).fill({ color: col, alpha });
      pg.x = x; pg.y = y; pg._vx = vx; pg._vy = vy;
      pg._life = 1; pg._decay = decay;
      fxLayer.addChild(pg);
      particlesRef.current.push(pg);
    };

    // Main explosion — firework ring burst
    for (let i = 0; i < 60; i++) {
      const col = fireColors[Math.floor(Math.random() * fireColors.length)];
      const angle = (i / 60) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const spd = 2 + Math.random() * 6;
      addP(cx, cy, Math.cos(angle) * spd, Math.sin(angle) * spd - 1,
        col, 2 + Math.random() * 6, 0.9, 0.01 + Math.random() * 0.02);
    }

    // Upward fire column
    for (let i = 0; i < 30; i++) {
      const col = fireColors[Math.floor(Math.random() * fireColors.length)];
      addP(
        cx + (Math.random() - 0.5) * 30, cy,
        (Math.random() - 0.5) * 1.5, -(3 + Math.random() * 5),
        col, 1.5 + Math.random() * 4, 0.8, 0.008 + Math.random() * 0.015
      );
    }

    // Smoke cloud
    for (let i = 0; i < 20; i++) {
      addP(
        cx + (Math.random() - 0.5) * 35, cy + (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 1, -(0.5 + Math.random() * 2),
        0x333333, 4 + Math.random() * 7, 0.3, 0.007 + Math.random() * 0.01
      );
    }

    // Red screen flash
    const flash = new PIXI.Graphics();
    flash.rect(0, 0, CW, CH).fill({ color: 0xff0000, alpha: 0.15 });
    fxLayer.addChild(flash);
    let flashLife = 1;
    const flashTicker = () => {
      flashLife -= 0.05;
      if (flashLife <= 0) {
        fxLayer.removeChild(flash);
        flash.destroy();
        appRef.current?.ticker.remove(flashTicker);
        activeTickersRef.current.delete(flashTicker);
        return;
      }
      flash.alpha = flashLife * 0.15;
    };
    appRef.current?.ticker.add(flashTicker);
    activeTickersRef.current.add(flashTicker);

    // Delayed secondary explosion
    const secId = setTimeout(() => {
      activeTimeoutsRef.current.delete(secId);
      if (!fxLayerRef.current) return;
      for (let i = 0; i < 30; i++) {
        const col = fireColors[Math.floor(Math.random() * fireColors.length)];
        const angle = Math.random() * Math.PI * 2;
        const spd = 1 + Math.random() * 4;
        addP(cx, cy, Math.cos(angle) * spd, Math.sin(angle) * spd - 0.5,
          col, 2 + Math.random() * 4, 0.75, 0.01 + Math.random() * 0.02);
      }
    }, 200);
    activeTimeoutsRef.current.add(secId);
  }, [calcLayout]);

  // ─── Screen Shake ───────────────────────────────────────────
  const screenShake = useCallback(() => {
    const app = appRef.current;
    if (!app) return;
    const stage = app.stage;
    const origX = stage.x;
    const origY = stage.y;
    let frame = 0;
    const maxFrames = 16;
    const intensity = 10;

    const shakeHandler = () => {
      frame++;
      if (frame >= maxFrames) {
        stage.x = origX;
        stage.y = origY;
        app.ticker.remove(shakeHandler);
        activeTickersRef.current.delete(shakeHandler);
        return;
      }
      const decay = 1 - frame / maxFrames;
      stage.x = origX + (Math.random() - 0.5) * intensity * decay * 2;
      stage.y = origY + (Math.random() - 0.5) * intensity * decay * 2;
    };
    app.ticker.add(shakeHandler);
    activeTickersRef.current.add(shakeHandler);
  }, []);

  // ─── Swap Dragon Sprite ─────────────────────────────────────
  const swapDragonSprite = useCallback((win: boolean) => {
    const TEX = texRef.current;
    const gridLayer = gridLayerRef.current;
    if (!gridLayer) return;
    const tex = win
      ? (TEX.dragon_fire ?? TEX.dragon_normal ?? TEX.dragon_small)
      : (TEX.dragon_normal ?? TEX.dragon_small);
    if (!tex) return;
    for (let i = 0; i < gridLayer.children.length; i++) {
      const ch = gridLayer.children[i];
      if (ch.label === 'wallDragon') {
        (ch as PIXI.Sprite).texture = tex;
        const sc = win
          ? Math.min(DRAGON_FIRE_MAX_W / tex.width, DRAGON_FIRE_MAX_H / tex.height)
          : Math.min(DRAGON_NORMAL_MAX_W / tex.width, DRAGON_NORMAL_MAX_H / tex.height);
        ch.scale.set(sc);
        dragonBaseScaleRef.current = sc;
        break;
      }
    }
  }, []);

  // ─── Show/Hide Flame Effects ────────────────────────────────
  // ─── Sound Preloading ──────────────────────────────────────
  const SOUND_BASE = (import.meta.env.VITE_BASE || '/dragon-tower') + '/assets/dragontower/sounds';
  const SOUND_FILES = [
    'fsounds-checkout.wav',
    'fbgsound.wav',
    'normal-state-bg-sound.wav',
    'lose-fsound.wav',
    'brick-s1.wav',
    'Win_egg.wav',
  ];

  const preloadSounds = useCallback(() => {
    const cache = soundCacheRef.current;
    SOUND_FILES.forEach((file) => {
      if (cache[file]) return;
      const audio = new Audio(`${SOUND_BASE}/${file}`);
      audio.preload = 'auto';
      audio.load();
      cache[file] = audio;
    });
  }, []);

  const playSound = useCallback((file: string, opts?: { loop?: boolean; volume?: number }): HTMLAudioElement => {
    const cache = soundCacheRef.current;
    // Clone from preloaded source for instant playback
    const src = cache[file];
    const audio = src ? src.cloneNode(true) as HTMLAudioElement : new Audio(`${SOUND_BASE}/${file}`);
    audio.loop = opts?.loop ?? false;
    audio.volume = opts?.volume ?? 0.8;
    audio.play().catch(() => {});
    return audio;
  }, []);

  const showFlameEffects = useCallback((show: boolean, winOnly?: boolean) => {
    const left = flameBorderLeftRef.current;
    const right = flameBorderRightRef.current;
    const topFlame = topFlameBgRef.current;
    const gTop = glowTopRef.current;
    const gBottom = glowBottomRef.current;
    // Flame borders only visible on win/cashout
    if (left) { left.visible = show; left.alpha = show ? 0.8 : 0; }
    if (right) { right.visible = show; right.alpha = show ? 0.8 : 0; }
    if (topFlame) { topFlame.visible = show && !!winOnly; topFlame.alpha = (show && !!winOnly) ? 0.7 : 0; }
    if (gTop) { gTop.visible = show; gTop.alpha = show ? 0.8 : 0; }
    if (gBottom) { gBottom.visible = show; gBottom.alpha = show ? 0.8 : 0; }
    // Dragon glow: hide on win (flame effects take over), show on normal/lose
    const dGlow = dragonGlowRef.current;
    if (dGlow) { dGlow.visible = !show; }

    // ── Sound effects ──
    if (show) {
      if (checkoutSoundRef.current) { checkoutSoundRef.current.pause(); checkoutSoundRef.current = null; }
      if (bgSoundRef.current) { bgSoundRef.current.pause(); bgSoundRef.current = null; }

      checkoutSoundRef.current = playSound('fsounds-checkout.wav', { volume: 0.8 });
      bgSoundRef.current = playSound('fbgsound.wav', { volume: 0.5 });
    } else {
      if (checkoutSoundRef.current) {
        checkoutSoundRef.current.pause();
        checkoutSoundRef.current.currentTime = 0;
        checkoutSoundRef.current = null;
      }
      if (bgSoundRef.current) {
        bgSoundRef.current.pause();
        bgSoundRef.current.currentTime = 0;
        bgSoundRef.current = null;
      }
    }
  }, [playSound]);

  // ─── Normal Background Sound (loop) ─────────────────────────
  const playNormalBgSound = useCallback(() => {
    if (normalBgSoundRef.current) {
      normalBgSoundRef.current.pause();
      normalBgSoundRef.current.currentTime = 0;
      normalBgSoundRef.current = null;
    }
    normalBgSoundRef.current = playSound('normal-state-bg-sound.wav', { loop: true, volume: 0.3 });
  }, [playSound]);

  const stopNormalBgSound = useCallback(() => {
    if (normalBgSoundRef.current) {
      normalBgSoundRef.current.pause();
      normalBgSoundRef.current.currentTime = 0;
      normalBgSoundRef.current = null;
    }
  }, []);

  // ─── Lose Sound (once) + bg fire ──────────────────────────
  const playLoseSound = useCallback(() => {
    if (loseSoundRef.current) { loseSoundRef.current.pause(); loseSoundRef.current = null; }
    if (bgSoundRef.current) { bgSoundRef.current.pause(); bgSoundRef.current = null; }
    if (brickSoundRef.current) { brickSoundRef.current.pause(); brickSoundRef.current = null; }

    loseSoundRef.current = playSound('lose-fsound.wav', { volume: 0.8 });
    brickSoundRef.current = playSound('brick-s1.wav', { volume: 0.8 });
    bgSoundRef.current = playSound('fbgsound.wav', { volume: 0.5 });
  }, [playSound]);

  const stopLoseSound = useCallback(() => {
    if (loseSoundRef.current) {
      loseSoundRef.current.pause();
      loseSoundRef.current.currentTime = 0;
      loseSoundRef.current = null;
    }
    if (brickSoundRef.current) {
      brickSoundRef.current.pause();
      brickSoundRef.current.currentTime = 0;
      brickSoundRef.current = null;
    }
    if (bgSoundRef.current) {
      bgSoundRef.current.pause();
      bgSoundRef.current.currentTime = 0;
      bgSoundRef.current = null;
    }
  }, []);

  // ─── Egg Pick Sound (once) ─────────────────────────────────
  const playEggSound = useCallback(() => {
    if (eggSoundRef.current) { eggSoundRef.current.pause(); eggSoundRef.current = null; }
    eggSoundRef.current = playSound('Win_egg.wav', { volume: 0.8 });
  }, [playSound]);

  // ─── Build Vignette ──────────────────────────────────────────
  const buildVignette = useCallback(() => {
    // no-op — stone background is now drawn inside drawFrame
  }, []);

  // ─── Scale Canvas ─────────────────────────────────────────────
  const scaleCanvas = useCallback(() => {
    const app = appRef.current;
    const wrap = canvasWrapRef.current;
    if (!app || !wrap) return;
    const canvas = app.canvas as HTMLCanvasElement;
    if (!canvas) return;
    const isMobile = window.innerWidth <= 767;
    if (isMobile) {
      // On mobile: fit canvas within available space, maintain aspect ratio
      const wrapW = wrap.clientWidth;
      const maxH = window.innerHeight;
      const aspect = CW / CH_MOBILE;
      // Start width-constrained, then cap by viewport height
      let w = wrapW;
      let h = Math.round(w / aspect);
      if (h > maxH) {
        h = maxH;
        w = Math.round(h * aspect);
      }
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      wrap.style.width = '100%';
    } else {
      // Clear any mobile inline styles on wrap
      wrap.style.width = '';
      // On desktop: fit canvas to 90% of available height
      const wrapW = wrap.clientWidth;
      const maxH = Math.min(wrap.clientHeight || window.innerHeight, window.innerHeight) * DESKTOP_SCALE;
      const aspect = CW / CH;
      let h = maxH;
      let w = Math.round(h * aspect);
      // If wider than wrapper, constrain by width instead
      if (w > wrapW) {
        w = wrapW;
        h = Math.round(w / aspect);
      }
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    }
  }, [canvasWrapRef]);

  // ─── Load Textures ───────────────────────────────────────────
  const loadTextures = useCallback(async (onLoaded?: () => void) => {
    const VBASE = import.meta.env.VITE_BASE || '/dragon-tower';
    const BASE = VBASE + '/assets/dragontower/images'
    const TEX = texRef.current;
    const imgMap: Record<string, string> = {
      dragon_small:  BASE+'/dragon-normal.png',
      wall_bottom:   BASE+'/wall.png',
      dragon_normal: BASE+'/dragon-normal.png',
      dragon_fire:   BASE+'/dragon-fire.png',
      wall:          BASE+'/wall.png',
      egg:           BASE+'/dragon-egg-3.png',
      dragon_sprite: BASE+'/dragon-icon-2-sprite.png',
      tile_dark:     BASE+'/black-tile.png',
      tile_green:    BASE+'/green-tile.png',
      result_bg:     BASE+'/result_background.png',
      flame_border:  BASE+'/flame-border.png',
      top_flame_bg:  BASE+'/top-flame-bg.png',
      dif_bg:        BASE+'/dif-bg.png',
      bal_bg:        BASE+'/bal-bg.png',
      randompic_bg:  BASE+'/randompic-bg.png',
      bet_bg:        BASE+'/bet-bg.png',
      bet_up_bg:     BASE+'/bet-up-bg.png',
      bet_down_bg:   BASE+'/bet-down-bg.png',
      total_profit_bg: BASE+'/total-profit-bg.png',
      gcoin:           BASE+'/gcoin.png',
      tower_border:    BASE+'/tower-border.png',
      top_lighting:    BASE+'/top-lighting.png',
      play_btn:        VBASE + '/assets/play_btn.png',
      play_btn_empty:  VBASE + '/assets/play_btn_empty.png',
    };

    const loadOne = async (key: string, path: string) => {
      try {
        TEX[key] = await PIXI.Assets.load(path);
        console.log('Loaded:', key);
      } catch (e: any) {
        console.warn('Failed to load:', key, path, e.message);
      }
    };

    await Promise.all(
      Object.entries(imgMap).map(([key, path]) => loadOne(key, path))
    );

    // Slice dragon spritesheet into frames
    if (TEX.dragon_sprite) {
      const baseTex = TEX.dragon_sprite as PIXI.Texture;
      // Use source dimensions for the full spritesheet
      const src = baseTex.source;
      const srcW = src.pixelWidth;
      const srcH = src.pixelHeight;
      const frameW = Math.floor(srcW / DRAGON_SPRITE_FRAMES);
      const frames: PIXI.Texture[] = [];
      for (let i = 0; i < DRAGON_SPRITE_FRAMES; i++) {
        const rect = new PIXI.Rectangle(i * frameW, 0, frameW, srcH);
        frames.push(new PIXI.Texture({ source: src, frame: rect }));
      }
      dragonFramesRef.current = frames;
      console.log(`Loaded: dragon_sprite (${DRAGON_SPRITE_FRAMES} frames, ${frameW}x${srcH}, src: ${srcW}x${srcH})`);
    }

    onLoaded?.();
  }, []);

  // ─── Init ────────────────────────────────────────────────────
  useEffect(() => {
    const wrap = canvasWrapRef.current;
    if (!wrap) return;

    let destroyed = false;

    (async () => {
      const mobile = window.innerWidth <= MOBILE_BREAKPOINT;
      isMobileRef.current = mobile;
      const app = new PIXI.Application();
      await app.init({
        width: CW,
        height: mobile ? CH_MOBILE : CH,
        backgroundAlpha: 0,
        resolution: Math.min(window.devicePixelRatio ?? 1, 2),
        autoDensity: true,
        antialias: true,
      });

      if (destroyed) {
        app.destroy(true, { children: true });
        return;
      }

      appRef.current = app;
      const canvas = app.canvas as HTMLCanvasElement;
      wrap.appendChild(canvas);

      const bgLayer = new PIXI.Container();
      const gridLayer = new PIXI.Container();
      const fxLayer = new PIXI.Container();
      const uiLayer = new PIXI.Container();
      bgLayerRef.current = bgLayer;
      gridLayer.y = GRID_LAYER_Y;
      gridLayer.sortableChildren = true;
      gridLayerRef.current = gridLayer;
      fxLayerRef.current = fxLayer;
      uiLayerRef.current = uiLayer;
      app.stage.addChild(bgLayer, gridLayer, fxLayer, uiLayer);

      app.ticker.add(() => {
        frameRef.current++;

        // ── Particle system ──────────────────────────────────────
        const particles = particlesRef.current;
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i] as any;
          p._life -= p._decay;
          if (p._life <= 0) {
            fxLayer.removeChild(p); p.destroy(); particles.splice(i, 1); continue;
          }
          p.x += p._vx; p.y += p._vy; p._vy += 0.12;
          p.alpha = p._life; p.scale.set(Math.max(0.05, p._life * 0.8 + 0.2));
        }

        // ── Tile entrance animations ──────────────────────────────
        const anims = tileAnimsRef.current;
        for (let i = anims.length - 1; i >= 0; i--) {
          const a = anims[i];
          a.progress += 0.07;
          if (a.progress >= 1) {
            a.root.scale.set(1);
            a.root.alpha = 1;
            anims.splice(i, 1);
          } else {
            const t = a.progress;
            const overshoot = 1.12;
            const ease = t < 0.55
              ? (t / 0.55) * overshoot
              : overshoot - (overshoot - 1) * ((t - 0.55) / 0.45);
            const startScale = 0.4;
            const s = startScale + (1 - startScale) * Math.min(ease, 1.08);
            a.root.scale.set(s);
            a.root.alpha = Math.min(1, t * 2.5);
          }
        }

        // ── Dragon icon floating animation + shadow ──────────────
        const tiles = tileObjsRef.current;
        for (let ri = 0; ri < tiles.length; ri++) {
          const row = tiles[ri];
          for (let ci = 0; ci < row.length; ci++) {
            const tile = row[ci];
            if (!tile) continue;
            // First pass: find icon and compute float value
            let floatVal = 0;
            let hasIcon = false;
            for (let k = 0; k < tile.icons.children.length; k++) {
              const ch = tile.icons.children[k];
              if (ch.label === 'dragonIcon') {
                const baseY = (ch as any)._baseY ?? 0;
                const offset = (ch as any)._floatOffset ?? 0;
                floatVal = Math.sin(frameRef.current * DRAGON_ICON_FLOAT_SPEED + offset);
                ch.y = baseY + floatVal * DRAGON_ICON_FLOAT_AMP;
                hasIcon = true;
                break;
              }
            }
            // Second pass: apply float to shadow
            if (hasIcon) {
              for (let k = 0; k < tile.icons.children.length; k++) {
                const ch = tile.icons.children[k];
                if (ch.label === 'dragonShadow') {
                  const t = (floatVal + 1) / 2; // 0 = up, 1 = down
                  const shadowScale = 0.7 + 0.3 * t;
                  const baseScX = (ch as any)._baseScaleX ?? 1;
                  const baseScY = (ch as any)._baseScaleY ?? 1;
                  ch.scale.set(baseScX * shadowScale, baseScY * shadowScale);
                  ch.alpha = 0.15 + 0.2 * t;
                  const r = Math.round(0x66 + (0xff - 0x66) * t);
                  const gg = Math.round(0x08 + (0x88 - 0x08) * t);
                  const b = Math.round(0x08 + (0x22 - 0x08) * t);
                  (ch as PIXI.Graphics).tint = (r << 16) | (gg << 8) | b;
                  break;
                }
              }
            }
          }
        }

        // ── FIRE BORDER ANIMATION — always visible during play ─────
        const st = getStateRef.current();
 
        // ── Ambient embers — only on win/cashout ──
        if (st.gstate === 'ended' && frameRef.current % 8 === 0) {
          const idleColors = [0xff5500, 0xff7700, 0xff9900];
          for (let i = 0; i < 2; i++) {
            const pg = new PIXI.Graphics() as any;
            const col = idleColors[Math.floor(Math.random() * idleColors.length)];
            pg.circle(0, 0, 0.5 + Math.random() * 1.5).fill({ color: col, alpha: 0.2 + Math.random() * 0.25 });
            pg.x = PAD + Math.random() * (CW - PAD * 2);
            pg.y = CH - 80 + Math.random() * 30;
            pg._vx = (Math.random() - 0.5) * 0.3;
            pg._vy = -(0.2 + Math.random() * 0.6);
            pg._life = 1;
            pg._decay = 0.008 + Math.random() * 0.012;
            fxLayer.addChild(pg);
            particles.push(pg);
          }
        }

        // ── Active row pulse ──────────────────────────────────────
        if (st.gstate === 'playing') {
          const pulseAlpha = 0.86 + 0.14 * Math.sin(frameRef.current * 0.06);
          const row = tileObjsRef.current[st.curRow];
          if (row) {
            for (let c = 0; c < row.length; c++) {
              if (row[c] && !(st.revealed[st.curRow] ?? {})[c]) {
                row[c].root.alpha = pulseAlpha;
              }
            }
          } 
        }

        // ── Dragon breathing animation + glow sync ────────────────
        const breathVal = Math.sin(frameRef.current * DRAGON_BREATH_FREQ);
        for (let i = 0; i < gridLayer.children.length; i++) {
          const ch = gridLayer.children[i];
          if (ch.label === 'wallDragon') {
            const base = dragonBaseScaleRef.current;
            ch.scale.set(base * (1 + DRAGON_BREATH_AMPLITUDE * breathVal));
            break;
          }
        }
        // Glow brightens when dragon inhales (scale up), dims on exhale
        const dGlow = dragonGlowRef.current;
        if (dGlow && dGlow.visible) {
          const t = (breathVal + 1) / 2; // 0 = exhale, 1 = inhale
          // Smooth easing: cubic ease-in-out for seamless pulse
          const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
          dGlow.alpha = 0.7 + 0.3 * eased;
        }

        // ── Flame & glow pulse (slow) ─────────────────────────────
        const pulse = Math.sin(frameRef.current * 0.02);
        const flameL = flameBorderLeftRef.current;
        const flameR = flameBorderRightRef.current;
        const gTop = glowTopRef.current;
        const gBot = glowBottomRef.current;
        if (flameL && flameL.visible) {
          flameL.alpha = 0.75 + 0.08 * pulse;
        }
        if (flameR && flameR.visible) {
          flameR.alpha = 0.75 + 0.08 * Math.sin(frameRef.current * 0.02 + 0.5);
        }
        if (gTop && gTop.visible) {
          gTop.alpha = 0.7 + 0.1 * pulse;
        }
        if (gBot && gBot.visible) {
          gBot.alpha = 0.7 + 0.1 * Math.sin(frameRef.current * 0.02 + 1);
        }

        // ── Multiplier display smooth scale ───────────────────────
        if (multDisplayRef.current && multDisplayRef.current.visible) {
          const s = multDisplayRef.current.scale.x;
          if (Math.abs(s - 1) > 0.01) {
            multDisplayRef.current.scale.set(s + (1 - s) * 0.12);
          } else {
            multDisplayRef.current.scale.set(1);
          }
        }
      });

      scaleCanvas();
      // Re-scale after layout settles (fixes stale size on refresh at tablet widths)
      requestAnimationFrame(() => scaleCanvas());

      const onResize = () => {
        const wasMobile = isMobileRef.current;
        const nowMobile = window.innerWidth <= MOBILE_BREAKPOINT;
        isMobileRef.current = nowMobile;

        if (wasMobile !== nowMobile) {
          // Resize the PixiJS renderer for the new mode
          app.renderer.resize(CW, nowMobile ? CH_MOBILE : CH);

          // Show/hide mobile panel layer
          const panelLayer = panelLayerRef.current;
          if (panelLayer) {
            panelLayer.visible = nowMobile;
          }

          // Rebuild grid with new aspect ratio
          const st = getStateRef.current();
          buildGrid(st.diff);
          refreshGrid(st.diff, st.gstate, st.curRow, st.revealed);
        }

        scaleCanvas();
      };
      window.addEventListener('resize', onResize);

      // Observe wrapper size changes (handles layout shifts after load)
      let ro: ResizeObserver | null = null;
      if (wrap) {
        ro = new ResizeObserver(() => scaleCanvas());
        ro.observe(wrap);
      }

      // Store cleanup handler for resize listener
      (app as any)._resizeCleanup = () => {
        window.removeEventListener('resize', onResize);
        if (ro) ro.disconnect();
      };
    })();

    return () => {
      destroyed = true;
      const app = appRef.current;
      if (app) {
        if ((app as any)._resizeCleanup) (app as any)._resizeCleanup();
        app.destroy(true, { children: true });
        appRef.current = null;
      }
    };
  }, [canvasWrapRef, scaleCanvas]);

  // ── Coin helper ──────────────────────────────────────────────
  const makeCoin = (size: number) => {
    const TEX = texRef.current;
    if (TEX.gcoin) {
      const sp = new PIXI.Sprite(TEX.gcoin);
      sp.width = size; sp.height = size;
      sp.anchor.set(0.5);
      return sp;
    }
    // Fallback if texture not loaded
    const c = new PIXI.Graphics();
    c.circle(0, 0, size / 2).fill({ color: 0xedb830 });
    return c;
  };

  // ── Mobile Panel (PixiJS) ─────────────────────────────────────
  const buildMobilePanel = useCallback(() => {
    const app = appRef.current;
    if (!app) return;
    const TEX = texRef.current;

    const panelLayer = new PIXI.Container();
    panelLayer.y = CH - PANEL_Y_OFFSET;
    panelLayer.visible = isMobileRef.current; // only visible on mobile
    panelLayerRef.current = panelLayer;
    app.stage.addChild(panelLayer);

    const pw = CW;
    const px = PANEL_PX;
    const contentW = pw - px * 2;
    const DIFF_OPTS: Difficulty[] = ['Easy', 'Medium', 'Hard', 'Expert', 'Master'];
    const lblStyle = { fontFamily: 'Poppins', fontSize: PANEL_LBL_FONT, fill: PANEL_LBL_COLOR, fontWeight: '700' as const };
    const amtStyle = { fontFamily: 'Poppins', fontSize: PANEL_AMT_FONT, fill: PANEL_GOLD_COLOR, fontWeight: '700' as const };

    let yy = PANEL_PY;

    // ── Row 1: Difficulty ──────────────────────────────────────
    const diffCard = new PIXI.Container();
    diffCard.x = px; diffCard.y = yy;
    if (TEX.dif_bg) {
      const bg = new PIXI.Sprite(TEX.dif_bg);
      bg.width = contentW; bg.height = PANEL_DIFF_H;
      diffCard.addChild(bg);
    } else {
      const bg = new PIXI.Graphics();
      bg.roundRect(0, 0, contentW, PANEL_DIFF_H, PANEL_CARD_RADIUS).fill({ color: PANEL_CARD_BG, alpha: 0.9 });
      diffCard.addChild(bg);
    }
    const diffLbl = new PIXI.Text({ text: 'DIFFICULTY', style: { ...lblStyle, letterSpacing: 2 } });
    diffLbl.x = PANEL_INNER_PX; diffLbl.y = PANEL_DIFF_H / 2; diffLbl.anchor.set(0, 0.5);
    diffCard.addChild(diffLbl);

    // Diff value + dropdown arrow "Medium ▼"
    const diffText = new PIXI.Text({ text: 'Medium', style: { fontFamily: 'Poppins', fontSize: PANEL_AMT_FONT, fill: 0xffffff, fontWeight: '700' } });
    const diffArrow = new PIXI.Text({ text: ' ▼', style: { fontFamily: 'Poppins', fontSize: PANEL_LBL_FONT, fill: PANEL_LBL_COLOR, fontWeight: '700' } });
    diffText.anchor.set(1, 0.5); diffText.x = contentW - PANEL_DIFF_RIGHT; diffText.y = PANEL_DIFF_H / 2;
    diffArrow.anchor.set(0, 0.5); diffArrow.x = contentW - PANEL_DIFF_RIGHT + 2; diffArrow.y = PANEL_DIFF_H / 2;
    diffCard.addChild(diffText); diffCard.addChild(diffArrow);

    // Tap to cycle difficulty
    const diffHit = new PIXI.Container();
    const diffHitBg = new PIXI.Graphics();
    diffHitBg.rect(0, 0, contentW, PANEL_DIFF_H).fill({ color: 0x000000, alpha: 0.001 });
    diffHit.addChild(diffHitBg);
    diffHit.eventMode = 'static'; diffHit.cursor = 'pointer';
    let diffCooldown = false;
    diffHit.on('pointerdown', () => {
      if (diffCooldown || panelCooldownRef.current) return;
      diffCooldown = true;
      const cur = diffText.text as Difficulty;
      const idx = DIFF_OPTS.indexOf(cur);
      const next = DIFF_OPTS[(idx + 1) % DIFF_OPTS.length];
      onDiffChangeRef.current?.(next);
      setTimeout(() => { diffCooldown = false; }, 300);
    });
    diffCard.addChild(diffHit);
    panelLayer.addChild(diffCard);
    yy += PANEL_DIFF_H + PANEL_ROW_GAP;

    // ── Row 2: Balance | [gap for play btn] | Random Pick ─────
    const midW = (contentW - PANEL_MID_GAP) / 2;

    // Balance card — "BALANCE  0.00  (coin)" all on one row
    const balCard = new PIXI.Container();
    balCard.x = px; balCard.y = yy;
    if (TEX.bal_bg) {
      const bg = new PIXI.Sprite(TEX.bal_bg);
      bg.width = midW; bg.height = PANEL_MID_H;
      balCard.addChild(bg);
    } else {
      const bg = new PIXI.Graphics();
      bg.roundRect(0, 0, midW, PANEL_MID_H, PANEL_CARD_RADIUS).fill({ color: PANEL_CARD_BG, alpha: 0.9 });
      balCard.addChild(bg);
    }
    const balLbl = new PIXI.Text({ text: 'BALANCE', style: { ...lblStyle, letterSpacing: 1.8 } });
    balLbl.x = PANEL_INNER_PX; balLbl.y = PANEL_MID_H / 2; balLbl.anchor.set(0, 0.5);
    balCard.addChild(balLbl);

    const initBal = useGameStore.getState().balance;
    const fmtBal = initBal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const balText = new PIXI.Text({ text: fmtBal, style: amtStyle });
    balText.x = PANEL_BAL_AMT_X; balText.y = PANEL_MID_H / 2; balText.anchor.set(0, 0.5);
    balCard.addChild(balText);

    const balCoin = makeCoin(PANEL_COIN_SIZE);
    balCoin.x = balText.x + balText.width + PANEL_COIN_GAP; balCoin.y = PANEL_MID_H / 2;
    balCard.addChild(balCoin);
    panelLayer.addChild(balCard);

    // Random Pick card — centered text
    const rndCard = new PIXI.Container();
    rndCard.x = px + midW + PANEL_MID_GAP; rndCard.y = yy;
    if (TEX.randompic_bg) {
      const bg = new PIXI.Sprite(TEX.randompic_bg);
      bg.width = midW; bg.height = PANEL_MID_H;
      rndCard.addChild(bg);
    } else {
      const bg = new PIXI.Graphics();
      bg.roundRect(0, 0, midW, PANEL_MID_H, PANEL_CARD_RADIUS).fill({ color: PANEL_CARD_BG, alpha: 0.9 });
      rndCard.addChild(bg);
    }
    const rndLbl = new PIXI.Text({ text: 'RANDOM PICK', style: { ...lblStyle, letterSpacing: 1.5 } });
    rndLbl.x = PANEL_RANDOM_INNER_PX; rndLbl.y = PANEL_MID_H / 2; rndLbl.anchor.set(0, 0.5);
    rndCard.addChild(rndLbl);
    const randomBtn = new PIXI.Container();
    const rndHitBg = new PIXI.Graphics();
    rndHitBg.rect(0, 0, midW, PANEL_MID_H).fill({ color: 0x000000, alpha: 0.001 });
    randomBtn.addChild(rndHitBg);
    randomBtn.eventMode = 'static'; randomBtn.cursor = 'pointer';
    randomBtn.on('pointerdown', () => { onRandomRef.current?.(); });
    rndCard.addChild(randomBtn);
    panelLayer.addChild(rndCard);
    yy += PANEL_MID_H + PANEL_ROW_GAP;

    // ── Row 3: Bet | Play Button | Total Profit ───────────────
    // Bottom row card width based on PANEL_BOT_GAP
    const botSideW = (contentW - PANEL_BOT_GAP) / 2;

    // Bet card — "BET" top-left, arrows top-right, coin + amount bottom-left
    const betCard = new PIXI.Container();
    betCard.x = px; betCard.y = yy;
    if (TEX.bet_bg) {
      const bg = new PIXI.Sprite(TEX.bet_bg);
      bg.width = botSideW; bg.height = PANEL_BOT_H;
      betCard.addChild(bg);
    } else {
      const bg = new PIXI.Graphics();
      bg.roundRect(0, 0, botSideW, PANEL_BOT_H, PANEL_CARD_RADIUS).fill({ color: PANEL_CARD_BG, alpha: 0.9 });
      betCard.addChild(bg);
    }
    const betLbl = new PIXI.Text({ text: 'BET', style: { ...lblStyle, letterSpacing: 1.8 } });
    betLbl.x = PANEL_INNER_PX; betLbl.y = PANEL_BET_LBL_Y;
    betCard.addChild(betLbl);

    // Coin + bet amount on bottom row
    const betCoin = makeCoin(PANEL_BET_COIN_SIZE);
    betCoin.x = PANEL_BET_COIN_X; betCoin.y = PANEL_BOT_H - PANEL_BET_BOT_OFFSET;
    betCard.addChild(betCoin);

    const betText = new PIXI.Text({ text: '5', style: { ...amtStyle, fontSize: PANEL_BET_AMT_FONT } });
    betText.x = PANEL_BET_AMT_X; betText.y = PANEL_BOT_H - PANEL_BET_BOT_OFFSET; betText.anchor.set(0, 0.5);
    betCard.addChild(betText);

    // Up/Down arrows on right side
    const arrowX = botSideW - PANEL_ARROW_RIGHT;
    const makeArrowBtn = (yPos: number, label: string, aw: number, ah: number, onTap: () => void) => {
      const btn = new PIXI.Container();
      btn.x = arrowX; btn.y = yPos;
      if (label === '▲' && TEX.bet_up_bg) {
        const sp = new PIXI.Sprite(TEX.bet_up_bg);
        sp.width = aw; sp.height = ah; btn.addChild(sp);
      } else if (label === '▼' && TEX.bet_down_bg) {
        const sp = new PIXI.Sprite(TEX.bet_down_bg);
        sp.width = aw; sp.height = ah; btn.addChild(sp);
      } else {
        const bg = new PIXI.Graphics();
        bg.roundRect(0, 0, aw, ah, 4).fill({ color: 0x1a2a3a });
        btn.addChild(bg);
        const txt = new PIXI.Text({ text: label, style: { fontFamily: 'Rajdhani', fontSize: PANEL_AMT_FONT, fill: PANEL_LBL_COLOR, fontWeight: '700' } });
        txt.anchor.set(0.5); txt.x = aw / 2; txt.y = ah / 2;
        btn.addChild(txt);
      }
      const hit = new PIXI.Graphics();
      hit.rect(0, 0, aw, ah).fill({ color: 0x000000, alpha: 0.001 });
      btn.addChild(hit);
      btn.eventMode = 'static'; btn.cursor = 'pointer';
      btn.on('pointerdown', onTap);
      return btn;
    };

    // Insufficient funds warning text (hidden by default)
    const insuffText = new PIXI.Text({ text: 'Insufficient funds', style: { fontFamily: 'Rajdhani', fontSize: 11, fill: 0xff4444, fontWeight: '700' } });
    insuffText.anchor.set(0.5, 0); insuffText.x = botSideW / 2; insuffText.y = PANEL_BOT_H + 2;
    insuffText.visible = false;
    betCard.addChild(insuffText);

    const parseFmt = (s: string) => parseFloat(s.replace(/,/g, '')) || 0;

    const upArrow = makeArrowBtn(PANEL_ARROW_UP_Y, '▲', PANEL_ARROW_UP_W, PANEL_ARROW_UP_H, () => {
      const cur = parseFmt(betText.text);
      const newBet = parseFloat((cur * 2).toFixed(2));
      const bal = parseFmt(balText.text);
      if (newBet > bal) {
        insuffText.visible = true;
        setTimeout(() => { insuffText.visible = false; }, 2000);
        return;
      }
      onBetChangeRef.current?.(Math.max(0.01, newBet));
    });
    betCard.addChild(upArrow);
    panelTextsRef.current.upArrow = upArrow;

    const downArrow = makeArrowBtn(PANEL_ARROW_DOWN_Y, '▼', PANEL_ARROW_DOWN_W, PANEL_ARROW_DOWN_H, () => {
      const cur = parseFmt(betText.text);
      onBetChangeRef.current?.(Math.max(0.01, parseFloat((cur * 0.5).toFixed(2))));
    });
    betCard.addChild(downArrow);
    panelTextsRef.current.downArrow = downArrow;
    panelLayer.addChild(betCard);

    // Total Profit card — aligned with Random Pick (right column)
    const profitCard = new PIXI.Container();
    profitCard.x = px + botSideW + PANEL_BOT_GAP; profitCard.y = yy;
    if (TEX.total_profit_bg) {
      const bg = new PIXI.Sprite(TEX.total_profit_bg);
      bg.width = botSideW; bg.height = PANEL_BOT_H;
      profitCard.addChild(bg);
    } else {
      const bg = new PIXI.Graphics();
      bg.roundRect(0, 0, botSideW, PANEL_BOT_H, PANEL_CARD_RADIUS).fill({ color: PANEL_CARD_BG, alpha: 0.9 });
      profitCard.addChild(bg);
    }
    // "TOTAL PROFIT (1.00×)" left-aligned on one line
    const profitLbl = new PIXI.Text({ text: 'TOTAL PROFIT', style: { ...lblStyle, letterSpacing: 1.5 } });
    profitLbl.x = PANEL_PROFIT_INNER_PX; profitLbl.y = PANEL_PROFIT_LBL_Y;
    profitCard.addChild(profitLbl);

    const multText = new PIXI.Text({ text: '(1.00×)', style: { fontFamily: 'Poppins', fontSize: PANEL_LBL_FONT, fill: PANEL_LBL_COLOR, fontWeight: '700' } });
    multText.x = profitLbl.x + profitLbl.width + PANEL_PROFIT_MULT_GAP; multText.y = PANEL_PROFIT_LBL_Y;
    profitCard.addChild(multText);

    // Amount + coin left-aligned on bottom row
    const profitText = new PIXI.Text({ text: '0.00000000', style: { ...amtStyle, fontSize: PANEL_PROFIT_AMT_FONT } });
    profitText.x = botSideW / 2; profitText.y = PANEL_BOT_H - PANEL_PROFIT_BOT_OFFSET; profitText.anchor.set(0.5, 0.5);
    profitCard.addChild(profitText);

    const profitCoin = makeCoin(PANEL_COIN_SIZE);
    const maxCoinX = botSideW - PANEL_COIN_SIZE / 2 - 6;
    profitCoin.x = Math.min(profitText.x + profitText.width / 2 + PANEL_PROFIT_COIN_GAP, maxCoinX);
    profitCoin.y = PANEL_BOT_H - PANEL_PROFIT_BOT_OFFSET;
    profitCard.addChild(profitCoin);
    panelLayer.addChild(profitCard);

    // ── Play Button (centered in gap between rows 2 & 3) ──────
    const playX = CW / 2;
    const playY = yy - PANEL_ROW_GAP / 2 + PLAY_BTN_Y_OFFSET;
    let playCircle: PIXI.Sprite | PIXI.Graphics;
    if (TEX.play_btn) {
      playCircle = new PIXI.Sprite(TEX.play_btn);
      playCircle.anchor.set(0.5);
      playCircle.width = PLAY_R * 2;
      playCircle.height = PLAY_R * 2;
    } else {
      const g = new PIXI.Graphics();
      g.circle(0, 0, PLAY_R + 4).fill({ color: 0x9aaa00, alpha: 0.3 });
      g.circle(0, 0, PLAY_R).fill({ color: 0xc8d800 });
      g.circle(0, 0, PLAY_R - 8).fill({ color: 0xe8f020, alpha: 0.5 });
      playCircle = g;
    }
    playCircle.x = playX; playCircle.y = playY;
    playCircle.eventMode = 'static'; playCircle.cursor = 'pointer';
    playCircle.on('pointerdown', () => {
      if (panelCooldownRef.current) return;
      onPlayActionRef.current?.();
    });
    panelLayer.addChild(playCircle);

    // Play triangle (only needed if no play_btn texture)
    const playTriangle = new PIXI.Graphics();
    if (!TEX.play_btn) {
      playTriangle.poly([
        { x: -10, y: -14 },
        { x: -10, y: 14 },
        { x: 16, y: 0 },
      ]).fill({ color: 0x1c2e00 });
    }
    playTriangle.x = playX + 3; playTriangle.y = playY;
    panelLayer.addChild(playTriangle);

    // Cash-out coin icon (hidden by default, shown when canCash)
    let playCoin: PIXI.Sprite | PIXI.Text;
    if (TEX.gcoin) {
      playCoin = new PIXI.Sprite(TEX.gcoin);
      playCoin.width = PLAY_COIN_SIZE; playCoin.height = PLAY_COIN_SIZE;
      playCoin.anchor.set(0.5);
    } else {
      playCoin = new PIXI.Text({ text: '💰', style: { fontSize: PLAY_LABEL_FONT } });
      (playCoin as PIXI.Text).anchor.set(0.5);
    }
    playCoin.x = playX; playCoin.y = playY - 10;
    playCoin.visible = false;
    panelLayer.addChild(playCoin);

    // Cash-out amount text (hidden by default)
    const playAmtText = new PIXI.Text({ text: '', style: { fontFamily: 'Rajdhani', fontSize: PLAY_AMT_FONT, fill: 0x1c2e00, fontWeight: '800' } });
    playAmtText.anchor.set(0.5); playAmtText.x = playX; playAmtText.y = playY + 14;
    playAmtText.visible = false;
    panelLayer.addChild(playAmtText);

    // Store all refs
    panelTextsRef.current = {
      ...panelTextsRef.current,
      balanceText: balText,
      balanceCoin: balCoin,
      betText: betText,
      diffText: diffText,
      multText: multText,
      profitText: profitText,
      profitCoin: profitCoin,
      playCircle: playCircle,
      playTriangle: playTriangle,
      playCoin: playCoin,
      playAmtText: playAmtText,
      randomBtn: randomBtn,
      diffHit: diffHit,
      diffCard: diffCard,
      profitCardW: botSideW,
    };
  }, []);

  interface PanelState {
    balance: number;
    bet: number;
    diff: Difficulty;
    gstate: GameState;
    curMult: number;
    curWin: number;
  }

  const updateMobilePanel = useCallback((state: PanelState) => {
    const t = panelTextsRef.current;
    const fmt = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    if (t.balanceText) {
      t.balanceText.text = fmt(state.balance);
      // Reposition coin after amount text
      if (t.balanceCoin) t.balanceCoin.x = t.balanceText.x + t.balanceText.width + PANEL_COIN_GAP;
    }
    if (t.betText) t.betText.text = String(state.bet);
    if (t.diffText) t.diffText.text = state.diff;
    if (t.multText) t.multText.text = `(${state.curMult.toFixed(2)}×)`;
    if (t.profitText) {
      t.profitText.text = state.curWin.toFixed(8);
      if (t.profitCoin) {
        const maxX = (t.profitCardW || 192) - PANEL_COIN_SIZE / 2 - 6;
        t.profitCoin.x = Math.min(t.profitText.x + t.profitText.width / 2 + PANEL_PROFIT_COIN_GAP, maxX);
      }
    }

    const playing = state.gstate === 'playing';
    const canCash = playing && state.curMult > 1;
    const disabled = (playing && !canCash) || panelCooldownRef.current;

    // Play button state
    const TEX = texRef.current;
    if (t.playCircle) {
      t.playCircle.alpha = disabled ? 0.45 : 1;
      // Swap play button texture for cashout state
      if (t.playCircle instanceof PIXI.Sprite) {
        if (canCash && TEX.play_btn_empty) {
          t.playCircle.texture = TEX.play_btn_empty;
        } else if (TEX.play_btn) {
          t.playCircle.texture = TEX.play_btn;
        }
      }
    }
    if (t.playTriangle && t.playCoin && t.playAmtText) {
      if (canCash) {
        t.playTriangle.visible = false;
        t.playCoin.visible = true;
        t.playAmtText.visible = true;
        t.playAmtText.text = fmt(state.curWin);
      } else {
        t.playTriangle.visible = true;
        t.playCoin.visible = false;
        t.playAmtText.visible = false;
      }
    }
    // Disable arrows and diff during play
    if (t.upArrow) { t.upArrow.alpha = playing ? 0.35 : 1; t.upArrow.eventMode = playing ? 'none' : 'static'; }
    if (t.downArrow) { t.downArrow.alpha = playing ? 0.35 : 1; t.downArrow.eventMode = playing ? 'none' : 'static'; }
    if (t.diffHit) { t.diffHit.eventMode = playing ? 'none' : 'static'; }
    if (t.diffCard) { t.diffCard.alpha = playing ? 0.45 : 1; }
    if (t.randomBtn) t.randomBtn.alpha = playing ? 1 : 0.4;
  }, []);

  return {
    buildGrid,
    refreshGrid,
    buildVignette,
    buildStoneBackground,
    buildMobilePanel,
    updateMobilePanel,
    loadTextures,
    preloadSounds,
    spawnFX,
    spawnWinCelebration,
    spawnLoseExplosion,
    screenShake,
    swapDragonSprite,
    showFlameEffects,
    playNormalBgSound,
    stopNormalBgSound,
    playLoseSound,
    stopLoseSound,
    playEggSound,
    scaleCanvas,
    showResultOverlay,
    hideResultOverlay,
    resetAnimationState,
    texRef,
    panelCooldownRef,
    appReady: !!appRef.current,
  };
}
