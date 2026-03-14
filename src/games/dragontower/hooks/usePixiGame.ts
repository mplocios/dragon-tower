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
    g.clear(); g.lineStyle(0);
    const R = 6;
    if (state === 'active' || state === 'hover') {
      setTileSprite(ts, TEX.tile_green ?? null, w, h);
      if (ts.children[0]) (ts.children[0] as PIXI.Sprite).alpha = state === 'hover' ? 1 : 0.88;
      if (ttex) ttex.alpha = 0;
    } else if (state === 'idle' || state === 'inactive') {
      setTileSprite(ts, TEX.tile_dark ?? null, w, h);
      if (ttex) ttex.alpha = 0;
    } else if (state === 'egg' || state === 'egg_dim') {
      setTileSprite(ts, null, w, h);
      g.beginFill(0x000000, 0.6); g.drawRoundedRect(1, 2, w, h, R); g.endFill();
      g.beginFill(0x080808); g.drawRoundedRect(0, 0, w, h, R); g.endFill();
      if (ttex) ttex.alpha = 0;
      if (state === 'egg') {
        // Selected egg — orange border
        g.lineStyle(2, 0xf0a020, 1); g.drawRoundedRect(0, 0, w, h, R);
      } else {
        // Unselected dim egg — subtle dark border
        g.lineStyle(2, 0x222222, 0.9); g.drawRoundedRect(0, 0, w, h, R);
      }
    } else if (state === 'dragon') {
      setTileSprite(ts, null, w, h);
      g.beginFill(0x000000, 0.5); g.drawRoundedRect(1, 2, w, h, R); g.endFill();
      g.beginFill(0x180303); g.drawRoundedRect(0, 0, w, h, R); g.endFill();
      g.beginFill(0x7a0606, 0.5); g.drawRoundedRect(0, 0, w, h, R); g.endFill();
      if (ttex) ttex.alpha = 0;
      g.lineStyle(2, 0xcc1414, 0.95); g.drawRoundedRect(0, 0, w, h, R);
    }
  }, [setTileSprite]);

  const setIcon = useCallback((tile: TileObj, type: TileContent) => {
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
    } else if (type === 'egg_dim') {
      // Other eggs revealed after a loss — entire tile at 50% opacity
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
    }
  }, []);

  // ─── Draw Frame ─────────────────────────────────────────────
  const drawFrame = useCallback((L: ReturnType<typeof calcLayout>) => {
    const TEX = texRef.current;
    const gridLayer = gridLayerRef.current!;
    const fx = PAD - 13, fy = L.gridY - 13;
    const fw = CW - fx - (PAD - 13), fh = L.gridH + 26, wcy = fy - WALL_H;
    const g = new PIXI.Graphics();

    g.beginFill(0x28251e); g.drawRoundedRect(fx, fy, fw, fh, 11); g.endFill();
    g.lineStyle(1.5, 0x18160e, 0.85);
    for (let y = fy + 20; y < fy + fh - 5; y += 20) { g.moveTo(fx + 6, y); g.lineTo(fx + fw - 6, y); }
    for (let r2 = 0; r2 * 20 < fh; r2++) {
      const yy = fy + r2 * 20, off = (r2 % 2) * 24;
      for (let x = fx + off; x < fx + fw; x += 48) { g.moveTo(x, yy); g.lineTo(x, Math.min(yy + 20, fy + fh)); }
    }
    g.lineStyle(0); g.beginFill(0x060c18, 0.75); g.drawRoundedRect(fx + 9, fy + 9, fw - 18, fh - 18, 7); g.endFill();
    g.lineStyle(1, 0x48402e, 0.25); g.drawRoundedRect(fx, fy, fw, fh, 11);
    gridLayer.addChild(g);

    if (TEX.wall) {
      const wt = new PIXI.Sprite(TEX.wall);
      wt.width = fw + 35; wt.height = WALL_H + 15;
      wt.x = fx - 20; wt.y = wcy + 10; wt.alpha = 1;
      gridLayer.addChild(wt);
    }

    const dTex = TEX.dragon_normal ?? TEX.dragon_small;
    if (dTex) {
      const ds = new PIXI.Sprite(dTex);
      const sc = Math.min(200 / ds.texture.width, 125 / ds.texture.height);
      ds.scale.set(sc); ds.anchor.set(0.5, 1); ds.x = CW / 2; ds.y = wcy + 35;
      (ds as any).name = 'wallDragon';
      gridLayer.addChild(ds);
    }

    if (TEX.wall_bottom) {
      const wb = new PIXI.Sprite(TEX.wall_bottom);
      const wbH = 56;
      wb.width = fw + 36; wb.height = wbH;
      wb.x = fx - 18; wb.y = fy + fh - wbH / 2 + 10;
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
      ttex = new PIXI.TilingSprite(TEX.tile_tex, w, h);
      ttex.alpha = 0; root.addChild(ttex);
    }
    const icons = new PIXI.Container(); root.addChild(icons);
    const hit = new PIXI.Graphics();
    hit.beginFill(0xffffff, 0.001); hit.drawRoundedRect(0, 0, w, h, 6); hit.endFill();
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
      const ml = new PIXI.Text('', { fontFamily: 'Rajdhani', fontSize: 10, fill: 0x1a3050, fontWeight: '700' });
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
        ml.style.fill = isCur ? 0xc8a44a : 0x1a3050;
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
        if (rv) { setIcon(tile, rv); }
        else { tile.icons.removeChildren(); tile.root.alpha = 1; if (tile.ttex) tile.ttex.alpha = 0; }
      }
    }
  }, [paintBg, setIcon]);

  // ─── Result Overlay ──────────────────────────────────────────
  const showResultOverlay = useCallback((type: 'win' | 'lose', mult: number, amount: number) => {
    const uiLayer = uiLayerRef.current;
    if (!uiLayer) return;

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
      card.beginFill(0x0d1828, 1);
      card.drawRoundedRect(cardX, cardY, cardW, cardH, 14);
      card.endFill();
      container.addChild(card);
    }

    const multText = new PIXI.Text(`${mult.toFixed(2)}x`, {
      fontFamily: 'Rajdhani', fontSize: 52, fontWeight: '900',
      fill: type === 'win' ? 0xe89010 : 0xcc3333,
    });
    multText.anchor.set(0.5, 0);
    multText.x = CW / 2; multText.y = cardY + 16;
    container.addChild(multText);

    const div = new PIXI.Graphics();
    div.lineStyle(1, 0xb47810, 0.35);
    div.moveTo(cardX + 30, cardY + 82);
    div.lineTo(cardX + cardW - 30, cardY + 82);
    container.addChild(div);

    const amtText = new PIXI.Text(`$${amount.toFixed(8)}`, {
      fontFamily: 'Rajdhani', fontSize: 13, fontWeight: '600', fill: 0xb0b8c4,
    });
    amtText.anchor.set(0.5, 0);
    amtText.x = CW / 2 - 12; amtText.y = cardY + 92;
    container.addChild(amtText);

    // Coin icon to the right of amount
    const coinR = 10;
    const coinX = cardX + cardW - 28;
    const coinY = cardY + 92 + coinR;
    const coin = new PIXI.Graphics();
    coin.beginFill(0xf0a020);
    coin.drawCircle(coinX, coinY, coinR);
    coin.endFill();
    coin.beginFill(0xc07010);
    coin.drawCircle(coinX, coinY, coinR * 0.7);
    coin.endFill();
    container.addChild(coin);

    const coinLabel = new PIXI.Text('₿', {
      fontFamily: 'Arial', fontSize: 10, fontWeight: '900', fill: 0xffffff,
    });
    coinLabel.anchor.set(0.5);
    coinLabel.x = coinX; coinLabel.y = coinY;
    container.addChild(coinLabel);

    uiLayer.addChild(container);
    resultOverlayRef.current = container;
  }, []);

  const hideResultOverlay = useCallback(() => {
    const uiLayer = uiLayerRef.current;
    if (!uiLayer || !resultOverlayRef.current) return;
    uiLayer.removeChild(resultOverlayRef.current);
    resultOverlayRef.current.destroy({ children: true });
    resultOverlayRef.current = null;
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
    const count = type === 'fire' ? 32 : 18;
    for (let i = 0; i < count; i++) {
      const pg = new PIXI.Graphics() as PIXI.Graphics & {
        _life: number; _decay: number; _vx: number; _vy: number;
      };
      pg.beginFill(pal[i % pal.length], 0.94);
      pg.drawCircle(0, 0, 2 + Math.random() * (type === 'fire' ? 7 : 4));
      pg.endFill();
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
      if ((ch as any).name === 'wallDragon') {
        (ch as PIXI.Sprite).texture = tex;
        const sc = win
          ? Math.min(300 / tex.width, 240 / tex.height)
          : Math.min(200 / tex.width, 125 / tex.height);
        ch.scale.set(sc);
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
    v.beginFill(0x000000, 0); v.drawRect(0, CH * 0.58, CW, CH * 0.42); v.endFill();
    v.beginFill(0x000000, 0); v.drawRect(0, 0, CW, CH * 0.15); v.endFill();
    bgLayer.addChild(v);
  }, []);

  // ─── Scale Canvas ─────────────────────────────────────────────
  const scaleCanvas = useCallback(() => {
    const app = appRef.current;
    const wrap = canvasWrapRef.current;
    if (!app || !wrap) return;
    const panel = wrap.closest('#game-panel') as HTMLElement | null;
    const viewEl = app.view as HTMLCanvasElement;
    const isMobile = window.innerWidth <= 767;
    if (isMobile) {
      const w = wrap.clientWidth;
      const h = Math.round(w * CH / CW);
      viewEl.style.width = `${w}px`;
      viewEl.style.height = `${h}px`;
      wrap.style.width = '100%';
    } else {
      const availH = ((panel?.clientHeight ?? 700) * 0.9) - 20;
      const maxW = 520;
      const byH = Math.round(availH * CW / CH);
      const w = Math.min(byH, maxW);
      const h = Math.round(w * CH / CW);
      viewEl.style.width = `${w}px`;
      viewEl.style.height = `${h}px`;
      wrap.style.width = `${w}px`;
    }
  }, [canvasWrapRef]);

  // ─── Load Textures ───────────────────────────────────────────
  const loadTextures = useCallback(async (onLoaded?: () => void) => {
    const TEX = texRef.current;
    const imgMap: Record<string, string> = {
      dragon_small:  '/assets/dragon-small.png',
      wall_bottom:   '/assets/wall.png',
      dragon_normal: '/assets/dragon-normal.png',
      dragon_fire:   '/assets/dragon-fire.png',
      wall:          '/assets/wall.png',
      tile_tex:      '/assets/tile-tex.png',
      egg:           '/assets/dragon-egg-3.png',
      dragon_icon:   '/assets/dragon-icon.png',
      tile_dark:     '/assets/black-tile.png',
      tile_green:    '/assets/green-tile.png',
      result_bg:     '/assets/result_background.png',
    };

    await Promise.all(
      Object.entries(imgMap).map(async ([key, path]) => {
        try {
          TEX[key] = await PIXI.Texture.fromURL(path);
          console.log('✅ Loaded:', key);
        } catch (e: any) {
          console.warn('❌ Failed to load:', key, path, e.message);
        }
      })
    );

    onLoaded?.();
  }, []);

  // ─── Init ────────────────────────────────────────────────────
  useEffect(() => {
    const wrap = canvasWrapRef.current;
    if (!wrap) return;

    const app = new PIXI.Application({
      width: CW, height: CH,
      backgroundAlpha: 0,
      resolution: Math.min(window.devicePixelRatio ?? 1, 2),
      autoDensity: true,
      antialias: true,
    });
    appRef.current = app;
    wrap.appendChild(app.view as HTMLCanvasElement);

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
    });

    scaleCanvas();
    const onResize = () => scaleCanvas();
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      app.destroy(true, { children: true });
      appRef.current = null;
    };
  }, [canvasWrapRef, scaleCanvas]);

  return {
    buildGrid,
    refreshGrid,
    buildVignette,
    loadTextures,
    spawnFX,
    swapDragonSprite,
    scaleCanvas,
    showResultOverlay,
    hideResultOverlay,
    texRef,
    appReady: !!appRef.current,
  };
}