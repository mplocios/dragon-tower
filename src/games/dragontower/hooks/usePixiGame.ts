import { useEffect, useRef, useCallback } from 'react';
import * as PIXI from 'pixi.js';
import { Difficulty, GameState, TileContent, TileState } from '../types';
import { CW, CH, PAD, TGAP, RGAP, WALL_H, DIFF, MULTS } from '../constants';

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
  const resultOverlayRef = useRef<PIXI.Container | null>(null);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const multDisplayRef = useRef<PIXI.Container | null>(null);
  const frameRef = useRef(0);
  const dragonBaseScaleRef = useRef(1);
  const revealedSetRef = useRef<Set<string>>(new Set());
  const tileAnimsRef = useRef<{ root: PIXI.Container; progress: number }[]>([]);

  const onTileClickRef = useRef(options.onTileClick);
  const onPlayAgainRef = useRef(options.onPlayAgain);
  const getStateRef = useRef(options.getState);
  useEffect(() => { onTileClickRef.current = options.onTileClick; }, [options.onTileClick]);
  useEffect(() => { onPlayAgainRef.current = options.onPlayAgain; }, [options.onPlayAgain]);
  useEffect(() => { getStateRef.current = options.getState; }, [options.getState]);

  // ─── Helpers ────────────────────────────────────────────────
  const calcLayout = useCallback((diff: Difficulty) => {
    const cfg = DIFF[diff];
    const gridW = CW - PAD * 2;
    const tileW = (gridW - TGAP * (cfg.cols - 1)) / cfg.cols;
    const maxH = (CH - 220 - RGAP * (cfg.rows - 1)) / cfg.rows;
    const tileH = Math.min(tileW * 0.55, maxH);
    const gridH = cfg.rows * tileH + (cfg.rows - 1) * RGAP;
    const gridY = CH - gridH - 60;
    return { cols: cfg.cols, rows: cfg.rows, tileW, tileH, gridH, gridY };
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
      g.roundRect(-3, -3, w + 6, h + 6, R + 3).fill({ color: 0xff2200, alpha: 0.1 });
      g.roundRect(1, 2, w, h, R).fill({ color: 0x000000, alpha: 0.5 });
      g.roundRect(0, 0, w, h, R).fill({ color: 0x180303 });
      g.roundRect(0, 0, w, h, R).fill({ color: 0x7a0606, alpha: 0.5 });
      if (ttex) ttex.alpha = 0;
      g.roundRect(0, 0, w, h, R).stroke({ width: 2, color: 0xcc1414, alpha: 0.95 });
    }
  }, [setTileSprite]);

  const setIcon = useCallback((tile: TileObj, type: TileContent, animate?: boolean) => {
    const TEX = texRef.current;
    tile.icons.removeChildren();
    const { w, h } = tile;
    if (type === 'egg') {
      if (TEX.egg) {
        const sp = new PIXI.Sprite(TEX.egg);
        const sc = Math.min((w * 0.87) / sp.texture.width, (h * 1.08) / sp.texture.height);
        sp.scale.set(sc); sp.anchor.set(0.5); sp.x = w / 2; sp.y = h / 2;
        tile.icons.addChild(sp);
      }
      tile.root.alpha = 1;
      if (animate) {
        tile.root.scale.set(0.4);
        tileAnimsRef.current.push({ root: tile.root, progress: 0 });
      }
    } else if (type === 'egg_dim') {
      if (TEX.egg) {
        const sp = new PIXI.Sprite(TEX.egg);
        const sc = Math.min((w * 0.87) / sp.texture.width, (h * 1.08) / sp.texture.height);
        sp.scale.set(sc); sp.anchor.set(0.5); sp.x = w / 2; sp.y = h / 2;
        tile.icons.addChild(sp);
      }
      tile.root.alpha = 0.5;
    } else if (type === 'dragon') {
      if (TEX.dragon_icon) {
        const sp = new PIXI.Sprite(TEX.dragon_icon);
        const sc = Math.min((w * 1.08) / sp.texture.width, (h * 1.17) / sp.texture.height);
        sp.scale.set(sc); sp.anchor.set(0.5); sp.x = w / 2; sp.y = h / 2;
        tile.icons.addChild(sp);
      }
      tile.root.alpha = 1;
      if (animate) {
        tile.root.scale.set(0.4);
        tileAnimsRef.current.push({ root: tile.root, progress: 0 });
      }
    }
  }, []);

  // ─── Draw Frame ─────────────────────────────────────────────
  const drawFrame = useCallback((L: ReturnType<typeof calcLayout>) => {
    const TEX = texRef.current;
    const gridLayer = gridLayerRef.current!;
    const fx = PAD - 13, fy = L.gridY - 13;
    const fw = CW - fx - (PAD - 13), fh = L.gridH + 26, wcy = fy - WALL_H;
    const g = new PIXI.Graphics();

    // Frame background
    g.roundRect(fx, fy, fw, fh, 0).fill({ color: 0x4f4f51 });

    // Horizontal lines
    for (let y = fy + 20; y < fy + fh - 5; y += 20) {
      g.moveTo(fx + 6, y).lineTo(fx + fw - 6, y);
    }
    // Vertical brick pattern
    for (let r2 = 0; r2 * 20 < fh; r2++) {
      const yy = fy + r2 * 20, off = (r2 % 2) * 24;
      for (let x = fx + off; x < fx + fw; x += 48) {
        g.moveTo(x, yy).lineTo(x, Math.min(yy + 20, fy + fh));
      }
    }
    g.stroke({ width: 1.5, color: 0x4f4f51, alpha: 0.85 });

    // Inner dark area
    g.roundRect(fx + 9, fy + 9, fw - 18, fh - 18, 0).fill({ color: 0x060c18, alpha: 0.75 });
    // Border
    g.roundRect(fx, fy, fw, fh, 0).stroke({ width: 1, color: 0x48402e, alpha: 0.25 });
    gridLayer.addChild(g);

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
      wt.width = fw + 35; wt.height = WALL_H + 25;
      wt.x = fx - 20; wt.y = wcy + 10; wt.alpha = 1;
      gridLayer.addChild(wt);
    }

    const dTex = TEX.dragon_normal ?? TEX.dragon_small;
    if (dTex) {
      const ds = new PIXI.Sprite(dTex);
      const sc = Math.min(200 / ds.texture.width, 130 / ds.texture.height);
      ds.scale.set(sc); ds.anchor.set(0.5, 1); ds.x = CW / 2; ds.y = wcy + 35;
      ds.label = 'wallDragon';
      dragonBaseScaleRef.current = sc;
      gridLayer.addChild(ds);
    }

    if (TEX.wall_bottom) {
      const wb = new PIXI.Sprite(TEX.wall_bottom);
      const wbH = 76;
      wb.width = fw + 36; wb.height = wbH;
      wb.x = fx - 18; wb.y = fy + fh - wbH / 2 + 20;
      wb.alpha = 1;
      gridLayer.addChild(wb);
    }
  }, [calcLayout]);

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
        const tile = makeTile(r, c, PAD + c * (L.tileW + TGAP), rowY, L.tileW, L.tileH);
        row[c] = tile;
        gridLayer.addChild(tile.root);
      }
      const ml = new PIXI.Text({ text: '', style: { fontFamily: 'Rajdhani', fontSize: 10, fill: 0x1a3050, fontWeight: '700' } });
      ml.anchor.set(0, 0.5); ml.x = CW - PAD + 5; ml.y = rowY + L.tileH / 2;
      gridLayer.addChild(ml);
      row._ml = ml;
      tileObjsRef.current[r] = row;
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
        ml.text = mults[r] ? `${mults[r]}×` : '';
        ml.style.fill = isCur ? 0xeacc50 : isPast ? 0x5a8a3a : 0x2a4060;
        ml.style.fontSize = isCur ? 12 : 10;
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

    const coinR = 10;
    const coinX = cardX + cardW - 28;
    const coinY = cardY + 92 + coinR;
    const coin = new PIXI.Graphics();
    coin.circle(coinX, coinY, coinR).fill({ color: 0xf0a020 });
    coin.circle(coinX, coinY, coinR * 0.7).fill({ color: 0xc07010 });
    container.addChild(coin);

    const coinLabel = new PIXI.Text({
      text: '₿',
      style: { fontFamily: 'Arial', fontSize: 10, fontWeight: '900', fill: 0xffffff },
    });
    coinLabel.anchor.set(0.5);
    coinLabel.x = coinX; coinLabel.y = coinY;
    container.addChild(coinLabel);

    container.scale.set(0.5);
    container.alpha = 0;
    tileAnimsRef.current.push({ root: container, progress: 0 });

    uiLayer.addChild(container);
    resultOverlayRef.current = container;

    if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    resultTimerRef.current = setTimeout(() => {
      resultTimerRef.current = null;
      onPlayAgainRef.current();
    }, 3000);
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

  // ─── Particles ───────────────────────────────────────────────
  const spawnFX = useCallback((
    r: number, c: number,
    type: 'fire' | 'sparkle',
    diff: Difficulty
  ) => {
    const fxLayer = fxLayerRef.current;
    if (!fxLayer) return;
    const L = calcLayout(diff);
    const cx = PAD + c * (L.tileW + TGAP) + L.tileW / 2;
    const cy = L.gridY + (L.rows - 1 - r) * (L.tileH + RGAP) + L.tileH / 2;
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
    setTimeout(() => {
      if (!fxLayerRef.current) return;
      const pos2 = [
        { x: CW * 0.15, y: L.gridY + L.gridH * 0.15 },
        { x: CW * 0.85, y: L.gridY + L.gridH * 0.15 },
        { x: CW * 0.5, y: L.gridY + L.gridH * 0.45 },
      ];
      pos2.forEach((p) => fireworkBurst(p.x, p.y, 30, 4, goldColors));
    }, 300);

    // ── WAVE 3: Final grand fireworks (650ms) ──
    setTimeout(() => {
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
        return;
      }
      flash.alpha = flashLife * 0.15;
    };
    appRef.current?.ticker.add(flashTicker);
  }, [calcLayout]);

  // ─── Lose Fire Explosion ────────────────────────────────────
  const spawnLoseExplosion = useCallback((r: number, c: number, diff: Difficulty) => {
    const fxLayer = fxLayerRef.current;
    if (!fxLayer) return;
    const L = calcLayout(diff);
    const cx = PAD + c * (L.tileW + TGAP) + L.tileW / 2;
    const cy = L.gridY + (L.rows - 1 - r) * (L.tileH + RGAP) + L.tileH / 2;
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
        return;
      }
      flash.alpha = flashLife * 0.15;
    };
    appRef.current?.ticker.add(flashTicker);

    // Delayed secondary explosion
    setTimeout(() => {
      if (!fxLayerRef.current) return;
      for (let i = 0; i < 30; i++) {
        const col = fireColors[Math.floor(Math.random() * fireColors.length)];
        const angle = Math.random() * Math.PI * 2;
        const spd = 1 + Math.random() * 4;
        addP(cx, cy, Math.cos(angle) * spd, Math.sin(angle) * spd - 0.5,
          col, 2 + Math.random() * 4, 0.75, 0.01 + Math.random() * 0.02);
      }
    }, 200);
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
        return;
      }
      const decay = 1 - frame / maxFrames;
      stage.x = origX + (Math.random() - 0.5) * intensity * decay * 2;
      stage.y = origY + (Math.random() - 0.5) * intensity * decay * 2;
    };
    app.ticker.add(shakeHandler);
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
          ? Math.min(300 / tex.width, 240 / tex.height)
          : Math.min(200 / tex.width, 130 / tex.height);
        ch.scale.set(sc);
        dragonBaseScaleRef.current = sc;
        break;
      }
    }
  }, []);

  // ─── Build Vignette ──────────────────────────────────────────
  const buildVignette = useCallback(() => {
    const bgLayer = bgLayerRef.current;
    if (!bgLayer) return;
    bgLayer.removeChildren();
    const v = new PIXI.Graphics();
    v.rect(0, CH * 0.58, CW, CH * 0.42).fill({ color: 0x000000, alpha: 0 });
    v.rect(0, 0, CW, CH * 0.15).fill({ color: 0x000000, alpha: 0 });
    bgLayer.addChild(v);
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
      const wrapH = wrap.clientHeight;
      const aspect = CW / CH;
      let w, h;
      if (wrapW / wrapH > aspect) {
        // Height constrained
        h = wrapH;
        w = Math.round(h * aspect);
      } else {
        // Width constrained
        w = wrapW;
        h = Math.round(w / aspect);
      }
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      wrap.style.width = '100%';
    } else {
      // Let CSS handle sizing — canvas fills wrap via height:100% + object-fit
      // Just clear any previously set inline styles
      canvas.style.width = '';
      canvas.style.height = '';
    }
  }, [canvasWrapRef]);

  // ─── Load Textures ───────────────────────────────────────────
  const loadTextures = useCallback(async (onLoaded?: () => void) => {
    const BASE = '/dragon-tower'
    const TEX = texRef.current;
    const imgMap: Record<string, string> = {
      dragon_small:  BASE+'/assets/dragon-small.png',
      wall_bottom:   BASE+'/assets/wall.png',
      dragon_normal: BASE+'/assets/dragon-normal.png',
      dragon_fire:   BASE+'/assets/dragon-fire.png',
      wall:          BASE+'/assets/wall.png',
      tile_tex:      BASE+'/assets/tile-tex.png',
      egg:           BASE+'/assets/dragon-egg-3.png',
      dragon_icon:   BASE+'/assets/dragon-icon.png',
      tile_dark:     BASE+'/assets/black-tile.png',
      tile_green:    BASE+'/assets/green-tile.png',
      result_bg:     BASE+'/assets/result_background.png',
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

    onLoaded?.();
  }, []);

  // ─── Init ────────────────────────────────────────────────────
  useEffect(() => {
    const wrap = canvasWrapRef.current;
    if (!wrap) return;

    let destroyed = false;

    (async () => {
      const app = new PIXI.Application();
      await app.init({
        width: CW,
        height: CH,
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

        // ── FIRE BORDER ANIMATION — always visible during play ─────
        const st = getStateRef.current();
        if (st.gstate === 'playing') {
          const cfg = DIFF[st.diff];
          const gridW = CW - PAD * 2;
          const tileW = (gridW - TGAP * (cfg.cols - 1)) / cfg.cols;
          const maxH = (CH - 220 - RGAP * (cfg.rows - 1)) / cfg.rows;
          const tileH = Math.min(tileW * 0.55, maxH);
          const gridH = cfg.rows * tileH + (cfg.rows - 1) * RGAP;
          const gridY = CH - gridH - 60;

          const fxX = PAD - 13;
          const fw = CW - fxX * 2;
          const leftX = fxX - 4;
          const rightX = fxX + fw + 4;
          const fireColors = [0xff2200, 0xff4400, 0xff6600, 0xff8800, 0xffaa00, 0xffcc00, 0xffdd33];
          const coreColors = [0xff0000, 0xff1100, 0xff3300, 0xee2200];

          // ── Main fire streams — left & right borders (every frame) ──
          if (frameRef.current % 2 === 0) {
            for (const sx of [leftX, rightX]) {
              const isLeft = sx < CW / 2;
              // 3-5 particles per side per frame for dense fire
              const count = 3 + Math.floor(Math.random() * 3);
              for (let i = 0; i < count; i++) {
                const pg = new PIXI.Graphics() as any;
                const col = fireColors[Math.floor(Math.random() * fireColors.length)];
                const size = 1.5 + Math.random() * 5;
                pg.circle(0, 0, size).fill({ color: col, alpha: 0.6 + Math.random() * 0.4 });
                pg.x = sx + (Math.random() - 0.5) * 14;
                pg.y = gridY + 10 + Math.random() * (gridH - 20);
                pg._vx = (isLeft ? -1 : 1) * (0.2 + Math.random() * 0.8);
                pg._vy = -(1.0 + Math.random() * 2.5);
                pg._life = 1;
                pg._decay = 0.012 + Math.random() * 0.022;
                fxLayer.addChild(pg);
                particles.push(pg);
              }
            }
          }

          // ── Inner core flames — brighter, tighter to wall (every frame) ──
          for (const sx of [leftX + 2, rightX - 2]) {
            if (Math.random() > 0.4) {
              const pg = new PIXI.Graphics() as any;
              const col = coreColors[Math.floor(Math.random() * coreColors.length)];
              pg.circle(0, 0, 1 + Math.random() * 3).fill({ color: col, alpha: 0.8 + Math.random() * 0.2 });
              pg.x = sx + (Math.random() - 0.5) * 6;
              pg.y = gridY + 20 + Math.random() * (gridH - 40);
              pg._vx = 0;
              pg._vy = -(1.5 + Math.random() * 3);
              pg._life = 1;
              pg._decay = 0.018 + Math.random() * 0.03;
              fxLayer.addChild(pg);
              particles.push(pg);
            }
          }

          // ── Bottom fire base — hot glow at base of tower ──────────
          if (frameRef.current % 3 === 0) {
            const baseY = gridY + gridH + 5;
            for (let i = 0; i < 4; i++) {
              const pg = new PIXI.Graphics() as any;
              const col = fireColors[Math.floor(Math.random() * fireColors.length)];
              pg.circle(0, 0, 2 + Math.random() * 4).fill({ color: col, alpha: 0.5 + Math.random() * 0.3 });
              pg.x = fxX + 10 + Math.random() * (fw - 20);
              pg.y = baseY + Math.random() * 8;
              pg._vx = (Math.random() - 0.5) * 0.6;
              pg._vy = -(0.8 + Math.random() * 1.5);
              pg._life = 1;
              pg._decay = 0.02 + Math.random() * 0.03;
              fxLayer.addChild(pg);
              particles.push(pg);
            }
          }

          // ── Rising embers — float up past dragon ──────────────────
          if (frameRef.current % 4 === 0) {
            for (let i = 0; i < 3; i++) {
              const pg = new PIXI.Graphics() as any;
              const col = fireColors[Math.floor(Math.random() * fireColors.length)];
              pg.circle(0, 0, 0.6 + Math.random() * 1.8).fill({ color: col, alpha: 0.3 + Math.random() * 0.4 });
              pg.x = fxX + Math.random() * fw;
              pg.y = gridY + gridH;
              pg._vx = (Math.random() - 0.5) * 0.5;
              pg._vy = -(0.5 + Math.random() * 1.2);
              pg._life = 1;
              pg._decay = 0.004 + Math.random() * 0.008;
              fxLayer.addChild(pg);
              particles.push(pg);
            }
          }

          // ── Top flames near dragon — heat wave ─────────────────────
          if (frameRef.current % 5 === 0) {
            for (let i = 0; i < 2; i++) {
              const topX = CW * 0.15 + Math.random() * CW * 0.7;
              const topY = gridY - 20 - Math.random() * 50;
              const pg = new PIXI.Graphics() as any;
              const col = fireColors[Math.floor(Math.random() * fireColors.length)];
              pg.circle(0, 0, 0.8 + Math.random() * 2.5).fill({ color: col, alpha: 0.3 + Math.random() * 0.35 });
              pg.x = topX; pg.y = topY;
              pg._vx = (Math.random() - 0.5) * 1;
              pg._vy = -(0.3 + Math.random() * 1);
              pg._life = 1;
              pg._decay = 0.015 + Math.random() * 0.025;
              fxLayer.addChild(pg);
              particles.push(pg);
            }
          }

          // ── Sparks that fly off the border ─────────────────────────
          if (frameRef.current % 8 === 0) {
            for (const sx of [leftX, rightX]) {
              const isLeft = sx < CW / 2;
              const pg = new PIXI.Graphics() as any;
              pg.circle(0, 0, 0.5 + Math.random() * 1.2).fill({ color: 0xffee44, alpha: 0.9 });
              pg.x = sx;
              pg.y = gridY + Math.random() * gridH;
              pg._vx = (isLeft ? -1 : 1) * (2 + Math.random() * 4);
              pg._vy = -(2 + Math.random() * 4);
              pg._life = 1;
              pg._decay = 0.04 + Math.random() * 0.06;
              fxLayer.addChild(pg);
              particles.push(pg);
            }
          }
        }

        // ── Idle ambient embers — subtle fire even when not playing ──
        if (st.gstate === 'idle' && frameRef.current % 8 === 0) {
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

        // ── Dragon breathing animation ────────────────────────────
        for (let i = 0; i < gridLayer.children.length; i++) {
          const ch = gridLayer.children[i];
          if (ch.label === 'wallDragon') {
            const base = dragonBaseScaleRef.current;
            const breath = base * (1 + 0.02 * Math.sin(frameRef.current * 0.035));
            ch.scale.set(breath);
            break;
          }
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
      const onResize = () => scaleCanvas();
      window.addEventListener('resize', onResize);

      // Store cleanup handler for resize listener
      (app as any)._resizeCleanup = () => window.removeEventListener('resize', onResize);
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

  return {
    buildGrid,
    refreshGrid,
    buildVignette,
    loadTextures,
    spawnFX,
    spawnWinCelebration,
    spawnLoseExplosion,
    screenShake,
    swapDragonSprite,
    scaleCanvas,
    showResultOverlay,
    hideResultOverlay,
    texRef,
    appReady: !!appRef.current,
  };
}
