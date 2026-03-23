import * as PIXI from 'pixi.js';
import { Difficulty, GameState } from '../types';
import { useGameStore } from '../store/useGameStore';
import { LEFT_PANEL_W, APP_H, DIFF, MIN_BET, MAX_BET } from '../constants';

// ── Colors matching the HTML panel ──
const C = {
  bg: 0x1a191d,
  surface: 0x100f13,
  border: 0x222222,
  tabActive: 0xffffff,
  tabInactive: 0x4a5568,
  tabBg: 0x100f13,
  labelColor: 0xb5b5b5,
  valueColor: 0xb5b5b5,
  textPrimary: 0xe2e8f0,
  accent: 0xeaff00,
  accentDark: 0x111200,
  gold: 0xc8a44a,
  green: 0x38d080,
  red: 0xe84040,
  btcOrange: 0xf0a020,
};

const PANEL_W = LEFT_PANEL_W;
const PANEL_H = APP_H;
const PAD = 14;
const CONTENT_W = PANEL_W - PAD * 2;
const FIELD_H = 44;
const BTN_H = 48;
const LABEL_FONT = 12;
const VALUE_FONT = 14;
const INPUT_FONT = 15;
const BTN_FONT = 15;
const GAP = 11;
const RADIUS = 9;

const DIFF_OPTS: Difficulty[] = ['Easy', 'Medium', 'Hard', 'Expert', 'Master'];

const fmt = (v: number) => '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtBet = (v: number) => v < 0.001 ? v.toFixed(8) : v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 });

export interface DesktopPanelCallbacks {
  onBetChange: (v: number) => void;
  onDiffChange: (v: Difficulty) => void;
  onStartGame: () => void;
  onCashOut: () => void;
  onRandom: () => void;
  onAutoToggle: () => void;
  onAutoSettingsChange: (s: Record<string, unknown>) => void;
  getCanvasRect: () => DOMRect | null;
}

export interface DesktopPanelRefs {
  container: PIXI.Container;
  update: (state: DesktopPanelState) => void;
  destroy: () => void;
}

export interface DesktopPanelState {
  balance: number;
  bet: number;
  diff: Difficulty;
  gstate: GameState;
  curMult: number;
  curWin: number;
  autoRunning: boolean;
  autoTotalProfit: number;
  autoCount: number;
  auto: ReturnType<typeof useGameStore.getState>['auto'];
  maxBetActive: boolean;
  playLock: boolean;
}

// ── Helper: rounded rect button ──
function makeButton(w: number, h: number, opts: {
  bgColor?: number; bgAlpha?: number; radius?: number;
  label?: string; fontSize?: number; fontColor?: number; fontFamily?: string; fontWeight?: string;
  gradient?: boolean;
}): { container: PIXI.Container; bg: PIXI.Graphics; text: PIXI.Text; hit: PIXI.Graphics } {
  const container = new PIXI.Container();
  const bg = new PIXI.Graphics();
  const r = opts.radius ?? RADIUS;

  if (opts.gradient) {
    const grad = new PIXI.FillGradient({
      type: 'linear', start: { x: 0, y: 0 }, end: { x: 1, y: 0 }, textureSpace: 'local',
      colorStops: [
        { offset: 0, color: '#a8c000' },
        { offset: 0.5, color: '#eaff00' },
        { offset: 1, color: '#a8c000' },
      ],
    });
    bg.roundRect(0, 0, w, h, r).fill(grad);
  } else {
    bg.roundRect(0, 0, w, h, r).fill({ color: opts.bgColor ?? C.surface, alpha: opts.bgAlpha ?? 1 });
  }
  container.addChild(bg);

  const text = new PIXI.Text({
    text: opts.label ?? '',
    style: {
      fontFamily: opts.fontFamily ?? 'Rajdhani',
      fontSize: opts.fontSize ?? BTN_FONT,
      fill: opts.fontColor ?? C.textPrimary,
      fontWeight: (opts.fontWeight ?? '700') as any,
    },
  });
  text.anchor.set(0.5);
  text.x = w / 2;
  text.y = h / 2;
  container.addChild(text);

  const hit = new PIXI.Graphics();
  hit.rect(0, 0, w, h).fill({ color: 0x000000, alpha: 0.001 });
  hit.eventMode = 'static';
  hit.cursor = 'pointer';
  container.addChild(hit);

  return { container, bg, text, hit };
}

// ── Helper: label text ──
function makeLabel(str: string, fontSize = LABEL_FONT): PIXI.Text {
  return new PIXI.Text({
    text: str,
    style: {
      fontFamily: 'Rajdhani', fontSize, fill: C.labelColor,
      fontWeight: '700', letterSpacing: 1.2,
    },
  });
}

function makeValueText(str: string, fontSize = VALUE_FONT, color = C.valueColor): PIXI.Text {
  return new PIXI.Text({
    text: str,
    style: { fontFamily: 'Rajdhani', fontSize, fill: color, fontWeight: '600' },
  });
}

// ── Helper: input-looking box ──
function makeInputBox(w: number, h: number): { container: PIXI.Container; bg: PIXI.Graphics; valueText: PIXI.Text } {
  const container = new PIXI.Container();
  const bg = new PIXI.Graphics();
  bg.roundRect(0, 0, w, h, RADIUS).fill({ color: C.surface });
  bg.roundRect(0, 0, w, h, RADIUS).stroke({ width: 1.5, color: 0xffffff, alpha: 0.07 });
  container.addChild(bg);

  const valueText = new PIXI.Text({
    text: '',
    style: { fontFamily: 'Rajdhani', fontSize: INPUT_FONT, fill: C.textPrimary, fontWeight: '700' },
  });
  valueText.x = 10;
  valueText.y = h / 2;
  valueText.anchor.set(0, 0.5);
  container.addChild(valueText);

  return { container, bg, valueText };
}

// ── Create an HTML overlay input ──
function createOverlayInput(id: string): HTMLInputElement {
  let input = document.getElementById(id) as HTMLInputElement | null;
  if (!input) {
    input = document.createElement('input');
    input.id = id;
    input.type = 'number';
    input.style.cssText = `
      position: fixed; z-index: 9999; opacity: 0; pointer-events: none;
      background: rgba(16,15,19,0.95); color: #e2e8f0; border: 1.5px solid rgba(255,255,255,0.18);
      border-radius: 6px; padding: 4px 8px; font-size: 14px; font-family: Rajdhani, sans-serif;
      font-weight: 700; outline: none; width: 1px; height: 1px;
    `;
    document.body.appendChild(input);
  }
  return input;
}

function showOverlayInput(input: HTMLInputElement, canvasRect: DOMRect, canvasW: number, canvasH: number, x: number, y: number, w: number, h: number) {
  const scaleX = canvasRect.width / canvasW;
  const scaleY = canvasRect.height / canvasH;
  input.style.left = `${canvasRect.left + x * scaleX}px`;
  input.style.top = `${canvasRect.top + y * scaleY}px`;
  input.style.width = `${w * scaleX}px`;
  input.style.height = `${h * scaleY}px`;
  input.style.opacity = '1';
  input.style.pointerEvents = 'auto';
  input.focus();
  input.select();
}

function hideOverlayInput(input: HTMLInputElement) {
  input.style.opacity = '0';
  input.style.pointerEvents = 'none';
  input.style.width = '1px';
  input.style.height = '1px';
}

export function buildDesktopPanel(app: PIXI.Application, callbacks: DesktopPanelCallbacks): DesktopPanelRefs {
  const gs = () => useGameStore.getState();
  const container = new PIXI.Container();
  container.x = 0; container.y = 0;

  // ── Background ──
  const panelBg = new PIXI.Graphics();
  panelBg.roundRect(0, 0, PANEL_W, PANEL_H, 18).fill({ color: C.bg });
  container.addChild(panelBg);

  // ── Scrollable content container ──
  const content = new PIXI.Container();
  content.x = PAD;
  content.y = PAD;
  container.addChild(content);

  let activeTab: 'manual' | 'auto' = 'manual';
  let cooldown = false;

  // ══════════════ TABS ══════════════
  const tabRow = new PIXI.Container();
  const tabBg = new PIXI.Graphics();
  tabBg.roundRect(0, 0, CONTENT_W, 40, 99).fill({ color: C.tabBg });
  tabRow.addChild(tabBg);

  const tabW = CONTENT_W / 2 - 3;
  const manualTab = makeButton(tabW, 34, {
    bgColor: C.tabActive, radius: 99, label: 'Manual', fontSize: 14,
    fontColor: C.accentDark, fontFamily: 'Rajdhani', fontWeight: '700',
  });
  manualTab.container.x = 3; manualTab.container.y = 3;
  tabRow.addChild(manualTab.container);

  const autoTab = makeButton(tabW, 34, {
    bgColor: C.tabBg, bgAlpha: 0, radius: 99, label: 'Auto', fontSize: 14,
    fontColor: C.tabInactive, fontFamily: 'Rajdhani', fontWeight: '700',
  });
  autoTab.container.x = tabW + 6; autoTab.container.y = 3;
  tabRow.addChild(autoTab.container);

  content.addChild(tabRow);

  const switchTab = (tab: 'manual' | 'auto') => {
    activeTab = tab;
    if (tab === 'manual') {
      manualTab.bg.clear().roundRect(0, 0, tabW, 34, 99).fill({ color: C.tabActive });
      manualTab.text.style.fill = C.accentDark;
      autoTab.bg.clear().roundRect(0, 0, tabW, 34, 99).fill({ color: 0x000000, alpha: 0 });
      autoTab.text.style.fill = C.tabInactive;
      manualContent.visible = true;
      autoContent.visible = false;
    } else {
      autoTab.bg.clear().roundRect(0, 0, tabW, 34, 99).fill({ color: C.tabActive });
      autoTab.text.style.fill = C.accentDark;
      manualTab.bg.clear().roundRect(0, 0, tabW, 34, 99).fill({ color: 0x000000, alpha: 0 });
      manualTab.text.style.fill = C.tabInactive;
      manualContent.visible = false;
      autoContent.visible = true;
    }
  };

  manualTab.hit.on('pointerdown', () => {
    if (gs().autoRunning) return;
    switchTab('manual');
  });
  autoTab.hit.on('pointerdown', () => {
    if (gs().gstate === 'playing') return;
    switchTab('auto');
  });

  // ══════════════ MANUAL TAB CONTENT ══════════════
  const manualContent = new PIXI.Container();
  manualContent.y = 40 + GAP;
  content.addChild(manualContent);

  let my = 0;

  // ── Total Bet label row ──
  const betLabel = makeLabel('TOTAL BET');
  betLabel.x = 0; betLabel.y = my;
  manualContent.addChild(betLabel);

  const betValueLabel = makeValueText(fmt(gs().bet));
  betValueLabel.anchor.set(1, 0);
  betValueLabel.x = CONTENT_W; betValueLabel.y = my;
  manualContent.addChild(betValueLabel);
  my += 20;

  // ── Bet input row ──
  const betInputRow = new PIXI.Container();
  betInputRow.y = my;

  // Input box (takes most width)
  const modBtnW = 36;
  const inputW = CONTENT_W - modBtnW * 2 - 2;
  const betInputBox = new PIXI.Graphics();
  betInputBox.roundRect(0, 0, inputW, FIELD_H, RADIUS).fill({ color: C.surface });
  betInputBox.roundRect(0, 0, inputW, FIELD_H, RADIUS).stroke({ width: 1.5, color: 0xffffff, alpha: 0.07 });
  betInputRow.addChild(betInputBox);

  const betInputText = new PIXI.Text({
    text: fmtBet(gs().bet),
    style: { fontFamily: 'Rajdhani', fontSize: INPUT_FONT, fill: C.textPrimary, fontWeight: '700' },
  });
  betInputText.x = 10; betInputText.y = FIELD_H / 2; betInputText.anchor.set(0, 0.5);
  betInputRow.addChild(betInputText);

  // Coin icon
  const coinG = new PIXI.Graphics();
  coinG.circle(0, 0, 11).fill({ color: C.btcOrange });
  const coinTxt = new PIXI.Text({ text: '₿', style: { fontFamily: 'Rajdhani', fontSize: 11, fill: 0xffffff, fontWeight: '900' } });
  coinTxt.anchor.set(0.5);
  coinG.addChild(coinTxt);
  coinG.x = inputW - 20; coinG.y = FIELD_H / 2;
  betInputRow.addChild(coinG);

  // ½ button
  const halfBtn = makeButton(modBtnW, FIELD_H, {
    bgColor: C.surface, label: '½', fontSize: 13, fontColor: C.valueColor,
  });
  halfBtn.container.x = inputW + 1;
  halfBtn.hit.on('pointerdown', () => {
    const s = gs();
    if (s.gstate === 'playing' || s.autoRunning) return;
    const next = parseFloat((s.bet * 0.5).toFixed(8));
    if (next < MIN_BET || next > s.balance) return;
    callbacks.onBetChange(next);
  });
  betInputRow.addChild(halfBtn.container);

  // 2× button
  const doubleBtn = makeButton(modBtnW, FIELD_H, {
    bgColor: C.surface, label: '2×', fontSize: 13, fontColor: C.valueColor,
  });
  doubleBtn.container.x = inputW + modBtnW + 2;
  doubleBtn.hit.on('pointerdown', () => {
    const s = gs();
    if (s.gstate === 'playing' || s.autoRunning) return;
    const next = parseFloat((s.bet * 2).toFixed(8));
    if (next > s.balance || next > MAX_BET) return;
    callbacks.onBetChange(next);
  });
  betInputRow.addChild(doubleBtn.container);

  // Bet input click → overlay input
  const betOverlayInput = createOverlayInput('desktop-bet-input');
  const betInputHit = new PIXI.Graphics();
  betInputHit.rect(0, 0, inputW, FIELD_H).fill({ color: 0x000000, alpha: 0.001 });
  betInputHit.eventMode = 'static'; betInputHit.cursor = 'text';
  betInputHit.on('pointerdown', () => {
    const s = gs();
    if (s.gstate === 'playing' || s.autoRunning) return;
    const rect = callbacks.getCanvasRect();
    if (!rect) return;
    const globalPos = betInputRow.getGlobalPosition();
    betOverlayInput.value = s.bet.toFixed(8);
    showOverlayInput(betOverlayInput, rect, app.screen.width, app.screen.height,
      globalPos.x, globalPos.y, inputW, FIELD_H);
  });
  betInputRow.addChild(betInputHit);

  betOverlayInput.addEventListener('input', () => {
    const parsed = parseFloat(betOverlayInput.value);
    if (!isNaN(parsed) && parsed >= MIN_BET && parsed <= gs().balance && parsed <= MAX_BET) {
      callbacks.onBetChange(parsed);
    }
  });
  betOverlayInput.addEventListener('blur', () => {
    hideOverlayInput(betOverlayInput);
    const parsed = parseFloat(betOverlayInput.value);
    const bal = gs().balance;
    if (isNaN(parsed) || parsed < MIN_BET) {
      callbacks.onBetChange(MIN_BET);
    } else {
      const clamped = Math.min(parsed, bal, MAX_BET);
      callbacks.onBetChange(clamped);
    }
  });

  manualContent.addChild(betInputRow);
  my += FIELD_H + GAP;

  // ── Difficulty ──
  const diffLabel = makeLabel('DIFFICULTY');
  diffLabel.x = 0; diffLabel.y = my;
  manualContent.addChild(diffLabel);
  my += 20;

  const diffBox = new PIXI.Container();
  diffBox.y = my;
  const diffBg = new PIXI.Graphics();
  diffBg.roundRect(0, 0, CONTENT_W, FIELD_H, RADIUS).fill({ color: C.surface });
  diffBg.roundRect(0, 0, CONTENT_W, FIELD_H, RADIUS).stroke({ width: 1.5, color: 0xffffff, alpha: 0.07 });
  diffBox.addChild(diffBg);

  const diffText = new PIXI.Text({
    text: gs().diff,
    style: { fontFamily: 'Rajdhani', fontSize: INPUT_FONT, fill: C.textPrimary, fontWeight: '600' },
  });
  diffText.x = 13; diffText.y = FIELD_H / 2; diffText.anchor.set(0, 0.5);
  diffBox.addChild(diffText);

  const diffArrow = new PIXI.Text({
    text: '▼',
    style: { fontFamily: 'Rajdhani', fontSize: 10, fill: C.labelColor, fontWeight: '700' },
  });
  diffArrow.anchor.set(1, 0.5); diffArrow.x = CONTENT_W - 12; diffArrow.y = FIELD_H / 2;
  diffBox.addChild(diffArrow);

  const diffHit = new PIXI.Graphics();
  diffHit.rect(0, 0, CONTENT_W, FIELD_H).fill({ color: 0x000000, alpha: 0.001 });
  diffHit.eventMode = 'static'; diffHit.cursor = 'pointer';
  let diffCooldown = false;
  diffHit.on('pointerdown', () => {
    if (diffCooldown || gs().gstate === 'playing') return;
    diffCooldown = true;
    const cur = gs().diff;
    const idx = DIFF_OPTS.indexOf(cur);
    const next = DIFF_OPTS[(idx + 1) % DIFF_OPTS.length];
    callbacks.onDiffChange(next);
    setTimeout(() => { diffCooldown = false; }, 300);
  });
  diffBox.addChild(diffHit);
  manualContent.addChild(diffBox);
  my += FIELD_H + GAP;

  // ── Action Button (Bet / CashOut / Pick) ──
  const actionBtn = makeButton(CONTENT_W, BTN_H, {
    gradient: true, label: 'Bet', fontSize: BTN_FONT,
    fontColor: C.accentDark, fontFamily: 'Cinzel', fontWeight: '900', radius: 11,
  });
  actionBtn.container.y = my;
  actionBtn.hit.on('pointerdown', () => {
    const s = gs();
    if (s.playLock) return;
    if (s.gstate === 'playing' && s.curMult > 1) {
      callbacks.onCashOut();
    } else if (s.gstate !== 'playing') {
      callbacks.onStartGame();
    }
  });
  manualContent.addChild(actionBtn.container);
  my += BTN_H + GAP;

  // ── Random Pick ──
  const randomBtn = makeButton(CONTENT_W, 44, {
    bgColor: 0x33333a, label: 'Random Pick', fontSize: 16,
    fontColor: C.labelColor, fontFamily: 'Poppins', fontWeight: '600', radius: 11,
  });
  randomBtn.container.y = my;
  randomBtn.hit.on('pointerdown', () => {
    if (gs().gstate !== 'playing') return;
    callbacks.onRandom();
  });
  manualContent.addChild(randomBtn.container);
  my += 44 + GAP;

  // ── Total Profit ──
  const profitLabelRow = new PIXI.Container();
  profitLabelRow.y = my;
  const profitLabel = makeLabel('TOTAL PROFIT');
  profitLabel.x = 0; profitLabel.y = 0;
  profitLabelRow.addChild(profitLabel);

  const profitMultText = makeValueText('(1.00×)', LABEL_FONT, C.labelColor);
  profitMultText.x = profitLabel.width + 4; profitMultText.y = 0;
  profitLabelRow.addChild(profitMultText);

  const profitValueLabel = makeValueText(fmt(0));
  profitValueLabel.anchor.set(1, 0);
  profitValueLabel.x = CONTENT_W; profitValueLabel.y = 0;
  profitLabelRow.addChild(profitValueLabel);
  manualContent.addChild(profitLabelRow);
  my += 20;

  const profitBox = new PIXI.Container();
  profitBox.y = my;
  const profitBg = new PIXI.Graphics();
  profitBg.roundRect(0, 0, CONTENT_W, FIELD_H, RADIUS).fill({ color: 0x33333a });
  profitBox.addChild(profitBg);

  const profitText = new PIXI.Text({
    text: fmt(0),
    style: { fontFamily: 'Rajdhani', fontSize: INPUT_FONT, fill: C.textPrimary, fontWeight: '700' },
  });
  profitText.x = 10; profitText.y = FIELD_H / 2; profitText.anchor.set(0, 0.5);
  profitBox.addChild(profitText);

  const profitCoin = new PIXI.Graphics();
  profitCoin.circle(0, 0, 11).fill({ color: C.btcOrange });
  const profitCoinTxt = new PIXI.Text({ text: '₿', style: { fontFamily: 'Rajdhani', fontSize: 11, fill: 0xffffff, fontWeight: '900' } });
  profitCoinTxt.anchor.set(0.5);
  profitCoin.addChild(profitCoinTxt);
  profitCoin.x = CONTENT_W - 20; profitCoin.y = FIELD_H / 2;
  profitBox.addChild(profitCoin);
  manualContent.addChild(profitBox);
  my += FIELD_H + GAP;

  // ── Divider ──
  const divider = new PIXI.Graphics();
  divider.rect(0, my, CONTENT_W, 1).fill({ color: 0xffffff, alpha: 0.07 });
  manualContent.addChild(divider);
  my += 1 + GAP;

  // ── Balance ──
  const balLabel = makeLabel('BALANCE');
  balLabel.x = 0; balLabel.y = my;
  manualContent.addChild(balLabel);

  const balValue = makeValueText(fmt(gs().balance), VALUE_FONT, C.textPrimary);
  balValue.anchor.set(1, 0);
  balValue.x = CONTENT_W; balValue.y = my;
  manualContent.addChild(balValue);

  // ══════════════ AUTO TAB CONTENT ══════════════
  const autoContent = new PIXI.Container();
  autoContent.y = 40 + GAP;
  autoContent.visible = false;
  content.addChild(autoContent);

  let ay = 0;

  // ── Auto Bet Amount ──
  const autoBetLabel = makeLabel('BET AMOUNT');
  autoBetLabel.x = 0; autoBetLabel.y = ay;
  autoContent.addChild(autoBetLabel);

  const autoBetValueLabel = makeValueText(fmt(gs().auto.autoBet));
  autoBetValueLabel.anchor.set(1, 0);
  autoBetValueLabel.x = CONTENT_W; autoBetValueLabel.y = ay;
  autoContent.addChild(autoBetValueLabel);
  ay += 20;

  // Auto bet input row
  const autoBetInputRow = new PIXI.Container();
  autoBetInputRow.y = ay;
  const autoBetInputBg = new PIXI.Graphics();
  autoBetInputBg.roundRect(0, 0, inputW, FIELD_H, RADIUS).fill({ color: C.surface });
  autoBetInputBg.roundRect(0, 0, inputW, FIELD_H, RADIUS).stroke({ width: 1.5, color: 0xffffff, alpha: 0.07 });
  autoBetInputRow.addChild(autoBetInputBg);

  const autoBetText = new PIXI.Text({
    text: fmtBet(gs().auto.autoBet),
    style: { fontFamily: 'Rajdhani', fontSize: INPUT_FONT, fill: C.textPrimary, fontWeight: '700' },
  });
  autoBetText.x = 10; autoBetText.y = FIELD_H / 2; autoBetText.anchor.set(0, 0.5);
  autoBetInputRow.addChild(autoBetText);

  const autoCoin = new PIXI.Graphics();
  autoCoin.circle(0, 0, 11).fill({ color: C.btcOrange });
  const autoCoinTxt = new PIXI.Text({ text: '₿', style: { fontFamily: 'Rajdhani', fontSize: 11, fill: 0xffffff, fontWeight: '900' } });
  autoCoinTxt.anchor.set(0.5);
  autoCoin.addChild(autoCoinTxt);
  autoCoin.x = inputW - 20; autoCoin.y = FIELD_H / 2;
  autoBetInputRow.addChild(autoCoin);

  // ½ / 2× for auto
  const autoHalfBtn = makeButton(modBtnW, FIELD_H, { bgColor: C.surface, label: '½', fontSize: 13, fontColor: C.valueColor });
  autoHalfBtn.container.x = inputW + 1;
  autoHalfBtn.hit.on('pointerdown', () => {
    if (gs().autoRunning) return;
    const cur = gs().auto.autoBet;
    const next = parseFloat((cur * 0.5).toFixed(8));
    if (next < MIN_BET || next > gs().balance) return;
    callbacks.onAutoSettingsChange({ autoBet: next });
  });
  autoBetInputRow.addChild(autoHalfBtn.container);

  const autoDoubleBtn = makeButton(modBtnW, FIELD_H, { bgColor: C.surface, label: '2×', fontSize: 13, fontColor: C.valueColor });
  autoDoubleBtn.container.x = inputW + modBtnW + 2;
  autoDoubleBtn.hit.on('pointerdown', () => {
    if (gs().autoRunning) return;
    const cur = gs().auto.autoBet;
    const next = parseFloat((cur * 2).toFixed(8));
    if (next > gs().balance || next > MAX_BET) return;
    callbacks.onAutoSettingsChange({ autoBet: next });
  });
  autoBetInputRow.addChild(autoDoubleBtn.container);

  // Auto bet click → overlay input
  const autoBetOverlay = createOverlayInput('desktop-auto-bet-input');
  const autoBetHit = new PIXI.Graphics();
  autoBetHit.rect(0, 0, inputW, FIELD_H).fill({ color: 0x000000, alpha: 0.001 });
  autoBetHit.eventMode = 'static'; autoBetHit.cursor = 'text';
  autoBetHit.on('pointerdown', () => {
    if (gs().autoRunning) return;
    const rect = callbacks.getCanvasRect();
    if (!rect) return;
    const globalPos = autoBetInputRow.getGlobalPosition();
    autoBetOverlay.value = gs().auto.autoBet.toFixed(8);
    showOverlayInput(autoBetOverlay, rect, app.screen.width, app.screen.height,
      globalPos.x, globalPos.y, inputW, FIELD_H);
  });
  autoBetInputRow.addChild(autoBetHit);

  autoBetOverlay.addEventListener('input', () => {
    const parsed = parseFloat(autoBetOverlay.value);
    if (!isNaN(parsed) && parsed >= MIN_BET && parsed <= gs().balance && parsed <= MAX_BET) {
      callbacks.onAutoSettingsChange({ autoBet: parsed });
    }
  });
  autoBetOverlay.addEventListener('blur', () => {
    hideOverlayInput(autoBetOverlay);
    const parsed = parseFloat(autoBetOverlay.value);
    const bal = gs().balance;
    if (isNaN(parsed) || parsed < MIN_BET) {
      callbacks.onAutoSettingsChange({ autoBet: MIN_BET });
    } else {
      callbacks.onAutoSettingsChange({ autoBet: Math.min(parsed, bal, MAX_BET) });
    }
  });

  autoContent.addChild(autoBetInputRow);
  ay += FIELD_H + GAP;

  // ── Auto Difficulty ──
  const autoDiffLabel = makeLabel('DIFFICULTY');
  autoDiffLabel.x = 0; autoDiffLabel.y = ay;
  autoContent.addChild(autoDiffLabel);
  ay += 20;

  const autoDiffBox = new PIXI.Container();
  autoDiffBox.y = ay;
  const autoDiffBg = new PIXI.Graphics();
  autoDiffBg.roundRect(0, 0, CONTENT_W, FIELD_H, RADIUS).fill({ color: C.surface });
  autoDiffBg.roundRect(0, 0, CONTENT_W, FIELD_H, RADIUS).stroke({ width: 1.5, color: 0xffffff, alpha: 0.07 });
  autoDiffBox.addChild(autoDiffBg);

  const autoDiffText = new PIXI.Text({
    text: gs().auto.autoDiff,
    style: { fontFamily: 'Rajdhani', fontSize: INPUT_FONT, fill: C.textPrimary, fontWeight: '600' },
  });
  autoDiffText.x = 13; autoDiffText.y = FIELD_H / 2; autoDiffText.anchor.set(0, 0.5);
  autoDiffBox.addChild(autoDiffText);

  const autoDiffArrow = new PIXI.Text({
    text: '▼', style: { fontFamily: 'Rajdhani', fontSize: 10, fill: C.labelColor, fontWeight: '700' },
  });
  autoDiffArrow.anchor.set(1, 0.5); autoDiffArrow.x = CONTENT_W - 12; autoDiffArrow.y = FIELD_H / 2;
  autoDiffBox.addChild(autoDiffArrow);

  const autoDiffHit = new PIXI.Graphics();
  autoDiffHit.rect(0, 0, CONTENT_W, FIELD_H).fill({ color: 0x000000, alpha: 0.001 });
  autoDiffHit.eventMode = 'static'; autoDiffHit.cursor = 'pointer';
  let autoDiffCD = false;
  autoDiffHit.on('pointerdown', () => {
    if (autoDiffCD || gs().autoRunning) return;
    autoDiffCD = true;
    const cur = gs().auto.autoDiff;
    const idx = DIFF_OPTS.indexOf(cur);
    const next = DIFF_OPTS[(idx + 1) % DIFF_OPTS.length];
    callbacks.onAutoSettingsChange({ autoDiff: next });
    callbacks.onDiffChange(next);
    setTimeout(() => { autoDiffCD = false; }, 300);
  });
  autoDiffBox.addChild(autoDiffHit);
  autoContent.addChild(autoDiffBox);
  ay += FIELD_H + GAP;

  // ── Auto Cashout Row ──
  const cashoutRowLabel = makeLabel('AUTO CASHOUT AT ROW');
  cashoutRowLabel.x = 0; cashoutRowLabel.y = ay;
  autoContent.addChild(cashoutRowLabel);

  const cashoutRowValue = makeValueText('Disabled', LABEL_FONT, C.labelColor);
  cashoutRowValue.anchor.set(1, 0); cashoutRowValue.x = CONTENT_W; cashoutRowValue.y = ay;
  autoContent.addChild(cashoutRowValue);
  ay += 20;

  const cashoutRowInput = makeInputBox(CONTENT_W, 38);
  cashoutRowInput.container.y = ay;
  cashoutRowInput.valueText.text = '';
  autoContent.addChild(cashoutRowInput.container);

  const cashoutOverlay = createOverlayInput('desktop-cashout-row-input');
  cashoutOverlay.min = '0'; cashoutOverlay.max = '9'; cashoutOverlay.step = '1';
  const cashoutHit = new PIXI.Graphics();
  cashoutHit.rect(0, 0, CONTENT_W, 38).fill({ color: 0x000000, alpha: 0.001 });
  cashoutHit.eventMode = 'static'; cashoutHit.cursor = 'text';
  cashoutHit.on('pointerdown', () => {
    if (gs().autoRunning) return;
    const rect = callbacks.getCanvasRect();
    if (!rect) return;
    const globalPos = cashoutRowInput.container.getGlobalPosition();
    cashoutOverlay.value = String(gs().auto.autoCashoutRow || '');
    showOverlayInput(cashoutOverlay, rect, app.screen.width, app.screen.height,
      globalPos.x, globalPos.y, CONTENT_W, 38);
  });
  cashoutRowInput.container.addChild(cashoutHit);

  cashoutOverlay.addEventListener('input', () => {
    const raw = cashoutOverlay.value;
    if (raw === '' || raw === '0') { callbacks.onAutoSettingsChange({ autoCashoutRow: 0 }); return; }
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed)) {
      const maxRow = DIFF[gs().auto.autoDiff]?.rows ?? 9;
      callbacks.onAutoSettingsChange({ autoCashoutRow: Math.min(parsed, maxRow) });
    }
  });
  cashoutOverlay.addEventListener('blur', () => { hideOverlayInput(cashoutOverlay); });
  ay += 38 + GAP;

  // ── Number of Bets ──
  const numBetsLabel = makeLabel('NUMBER OF BETS');
  numBetsLabel.x = 0; numBetsLabel.y = ay;
  autoContent.addChild(numBetsLabel);

  const numBetsValue = makeValueText('∞ Infinite', LABEL_FONT, C.gold);
  numBetsValue.anchor.set(1, 0); numBetsValue.x = CONTENT_W; numBetsValue.y = ay;
  autoContent.addChild(numBetsValue);
  ay += 20;

  const numBetsInput = makeInputBox(CONTENT_W, 38);
  numBetsInput.container.y = ay;
  numBetsInput.valueText.text = '';
  autoContent.addChild(numBetsInput.container);

  const numBetsOverlay = createOverlayInput('desktop-num-bets-input');
  numBetsOverlay.min = '0'; numBetsOverlay.step = '1';
  const numBetsHit = new PIXI.Graphics();
  numBetsHit.rect(0, 0, CONTENT_W, 38).fill({ color: 0x000000, alpha: 0.001 });
  numBetsHit.eventMode = 'static'; numBetsHit.cursor = 'text';
  numBetsHit.on('pointerdown', () => {
    if (gs().autoRunning) return;
    const rect = callbacks.getCanvasRect();
    if (!rect) return;
    const globalPos = numBetsInput.container.getGlobalPosition();
    numBetsOverlay.value = gs().auto.autoCount === 0 ? '' : String(gs().auto.autoCount);
    showOverlayInput(numBetsOverlay, rect, app.screen.width, app.screen.height,
      globalPos.x, globalPos.y, CONTENT_W, 38);
  });
  numBetsInput.container.addChild(numBetsHit);

  numBetsOverlay.addEventListener('input', () => {
    const raw = numBetsOverlay.value;
    if (raw === '' || raw === '0') { callbacks.onAutoSettingsChange({ autoCount: 0 }); return; }
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed)) callbacks.onAutoSettingsChange({ autoCount: Math.max(0, parsed) });
  });
  numBetsOverlay.addEventListener('blur', () => { hideOverlayInput(numBetsOverlay); });
  ay += 38 + GAP;

  // ── On Win / On Loss (simplified) ──
  const onWinLabel = makeLabel('ON WIN');
  onWinLabel.x = 0; onWinLabel.y = ay;
  autoContent.addChild(onWinLabel);
  ay += 18;

  const winResetBtn = makeButton(60, 30, { bgColor: 0x33333a, label: 'Reset', fontSize: 12, fontColor: C.textPrimary, radius: 6 });
  winResetBtn.container.x = 0; winResetBtn.container.y = ay;
  winResetBtn.hit.on('pointerdown', () => { if (!gs().autoRunning) callbacks.onAutoSettingsChange({ onWinMode: 'reset' }); });
  autoContent.addChild(winResetBtn.container);

  const winIncBtn = makeButton(72, 30, { bgColor: C.bg, label: 'Increase', fontSize: 12, fontColor: C.textPrimary, radius: 6 });
  winIncBtn.container.x = 65; winIncBtn.container.y = ay;
  winIncBtn.hit.on('pointerdown', () => { if (!gs().autoRunning) callbacks.onAutoSettingsChange({ onWinMode: 'increase' }); });
  autoContent.addChild(winIncBtn.container);
  ay += 30 + GAP;

  // ── On Loss ──
  const onLossLabel = makeLabel('ON LOSS');
  onLossLabel.x = 0; onLossLabel.y = ay;
  autoContent.addChild(onLossLabel);
  ay += 18;

  const lossResetBtn = makeButton(60, 30, { bgColor: 0x33333a, label: 'Reset', fontSize: 12, fontColor: C.textPrimary, radius: 6 });
  lossResetBtn.container.x = 0; lossResetBtn.container.y = ay;
  lossResetBtn.hit.on('pointerdown', () => { if (!gs().autoRunning) callbacks.onAutoSettingsChange({ onLossMode: 'reset' }); });
  autoContent.addChild(lossResetBtn.container);

  const lossIncBtn = makeButton(72, 30, { bgColor: C.bg, label: 'Increase', fontSize: 12, fontColor: C.textPrimary, radius: 6 });
  lossIncBtn.container.x = 65; lossIncBtn.container.y = ay;
  lossIncBtn.hit.on('pointerdown', () => { if (!gs().autoRunning) callbacks.onAutoSettingsChange({ onLossMode: 'increase' }); });
  autoContent.addChild(lossIncBtn.container);
  ay += 30 + GAP;

  // ── Stop Profit / Stop Loss ──
  const halfW = (CONTENT_W - 7) / 2;
  const stopProfitLabel = makeLabel('STOP PROFIT ($)');
  stopProfitLabel.x = 0; stopProfitLabel.y = ay;
  autoContent.addChild(stopProfitLabel);

  const stopLossLabel = makeLabel('STOP LOSS ($)');
  stopLossLabel.x = halfW + 7; stopLossLabel.y = ay;
  autoContent.addChild(stopLossLabel);
  ay += 18;

  const stopProfitInput = makeInputBox(halfW, 38);
  stopProfitInput.container.x = 0; stopProfitInput.container.y = ay;
  autoContent.addChild(stopProfitInput.container);

  const stopProfitOverlay = createOverlayInput('desktop-stop-profit-input');
  const spHit = new PIXI.Graphics();
  spHit.rect(0, 0, halfW, 38).fill({ color: 0x000000, alpha: 0.001 });
  spHit.eventMode = 'static'; spHit.cursor = 'text';
  spHit.on('pointerdown', () => {
    if (gs().autoRunning) return;
    const rect = callbacks.getCanvasRect();
    if (!rect) return;
    const gp = stopProfitInput.container.getGlobalPosition();
    stopProfitOverlay.value = gs().auto.stopProfit ? String(gs().auto.stopProfit) : '';
    showOverlayInput(stopProfitOverlay, rect, app.screen.width, app.screen.height, gp.x, gp.y, halfW, 38);
  });
  stopProfitInput.container.addChild(spHit);
  stopProfitOverlay.addEventListener('input', () => {
    const v = parseFloat(stopProfitOverlay.value);
    callbacks.onAutoSettingsChange({ stopProfit: isNaN(v) ? 0 : Math.max(0, v) });
  });
  stopProfitOverlay.addEventListener('blur', () => { hideOverlayInput(stopProfitOverlay); });

  const stopLossInput = makeInputBox(halfW, 38);
  stopLossInput.container.x = halfW + 7; stopLossInput.container.y = ay;
  autoContent.addChild(stopLossInput.container);

  const stopLossOverlay = createOverlayInput('desktop-stop-loss-input');
  const slHit = new PIXI.Graphics();
  slHit.rect(0, 0, halfW, 38).fill({ color: 0x000000, alpha: 0.001 });
  slHit.eventMode = 'static'; slHit.cursor = 'text';
  slHit.on('pointerdown', () => {
    if (gs().autoRunning) return;
    const rect = callbacks.getCanvasRect();
    if (!rect) return;
    const gp = stopLossInput.container.getGlobalPosition();
    stopLossOverlay.value = gs().auto.stopLoss ? String(gs().auto.stopLoss) : '';
    showOverlayInput(stopLossOverlay, rect, app.screen.width, app.screen.height, gp.x, gp.y, halfW, 38);
  });
  stopLossInput.container.addChild(slHit);
  stopLossOverlay.addEventListener('input', () => {
    const v = parseFloat(stopLossOverlay.value);
    callbacks.onAutoSettingsChange({ stopLoss: isNaN(v) ? 0 : Math.max(0, v) });
  });
  stopLossOverlay.addEventListener('blur', () => { hideOverlayInput(stopLossOverlay); });
  ay += 38 + GAP;

  // ── Start / Stop Autobet ──
  const autoActionBtn = makeButton(CONTENT_W, BTN_H, {
    gradient: true, label: '▶ Start Autobet', fontSize: 14,
    fontColor: C.accentDark, fontFamily: 'Cinzel', fontWeight: '900', radius: 11,
  });
  autoActionBtn.container.y = ay;
  autoActionBtn.hit.on('pointerdown', () => {
    const s = gs();
    if (s.gstate === 'playing' && !s.autoRunning) return;
    callbacks.onAutoToggle();
  });
  autoContent.addChild(autoActionBtn.container);
  ay += BTN_H + GAP;

  // ── Auto Divider ──
  const autoDivider = new PIXI.Graphics();
  autoDivider.rect(0, ay, CONTENT_W, 1).fill({ color: 0xffffff, alpha: 0.07 });
  autoContent.addChild(autoDivider);
  ay += 1 + GAP;

  // ── Auto Balance ──
  const autoBalLabel = makeLabel('BALANCE');
  autoBalLabel.x = 0; autoBalLabel.y = ay;
  autoContent.addChild(autoBalLabel);

  const autoBalValue = makeValueText(fmt(gs().balance), VALUE_FONT, C.textPrimary);
  autoBalValue.anchor.set(1, 0); autoBalValue.x = CONTENT_W; autoBalValue.y = ay;
  autoContent.addChild(autoBalValue);
  ay += 20;

  // ── Session Profit (visible during autoplay) ──
  const sessionProfitRow = new PIXI.Container();
  sessionProfitRow.y = ay;
  sessionProfitRow.visible = false;
  const spLabel = makeLabel('SESSION PROFIT');
  spLabel.x = 0; spLabel.y = 0;
  sessionProfitRow.addChild(spLabel);
  const spValue = makeValueText('$0.00', VALUE_FONT, C.green);
  spValue.anchor.set(1, 0); spValue.x = CONTENT_W; spValue.y = 0;
  sessionProfitRow.addChild(spValue);
  autoContent.addChild(sessionProfitRow);

  // ── Rounds Left (visible during autoplay) ──
  const roundsRow = new PIXI.Container();
  roundsRow.y = ay + 22;
  roundsRow.visible = false;
  const rlLabel = makeLabel('ROUNDS LEFT');
  rlLabel.x = 0; rlLabel.y = 0;
  roundsRow.addChild(rlLabel);
  const rlValue = makeValueText('∞', VALUE_FONT, C.gold);
  rlValue.anchor.set(1, 0); rlValue.x = CONTENT_W; rlValue.y = 0;
  roundsRow.addChild(rlValue);
  autoContent.addChild(roundsRow);

  // ══════════════ UPDATE FUNCTION ══════════════
  const update = (state: DesktopPanelState) => {
    const { balance, bet, diff, gstate, curMult, curWin, autoRunning: ar, autoTotalProfit: atp, autoCount: ac, auto: autoS, playLock } = state;
    const playing = gstate === 'playing';
    const canCash = playing && curMult > 1;

    // Manual tab
    betValueLabel.text = fmt(bet);
    betInputText.text = fmtBet(bet);
    diffText.text = diff;
    balValue.text = fmt(balance);
    profitMultText.text = `(${curMult.toFixed(2)}×)`;
    profitValueLabel.text = fmt(curWin);
    profitValueLabel.style.fill = curWin > 0 ? C.green : C.valueColor;
    profitText.text = fmt(curWin);

    // Action button state
    if (canCash) {
      actionBtn.bg.clear();
      const grad = new PIXI.FillGradient({
        type: 'linear', start: { x: 0, y: 0 }, end: { x: 1, y: 0 }, textureSpace: 'local',
        colorStops: [
          { offset: 0, color: '#a8c000' },
          { offset: 0.5, color: '#eaff00' },
          { offset: 1, color: '#a8c000' },
        ],
      });
      actionBtn.bg.roundRect(0, 0, CONTENT_W, BTN_H, 11).fill(grad);
      actionBtn.text.text = `Cash Out ${fmt(curWin)}`;
      actionBtn.text.style.fill = C.accentDark;
      actionBtn.text.style.fontSize = 13;
      actionBtn.container.alpha = 1;
    } else if (playing) {
      actionBtn.bg.clear().roundRect(0, 0, CONTENT_W, BTN_H, 11).fill({ color: 0x161e06 });
      actionBtn.text.text = 'Pick a tile...';
      actionBtn.text.style.fill = 0x2a3208;
      actionBtn.text.style.fontSize = BTN_FONT;
      actionBtn.container.alpha = 0.6;
    } else {
      actionBtn.bg.clear();
      const grad = new PIXI.FillGradient({
        type: 'linear', start: { x: 0, y: 0 }, end: { x: 1, y: 0 }, textureSpace: 'local',
        colorStops: [
          { offset: 0, color: '#a8c000' },
          { offset: 0.5, color: '#eaff00' },
          { offset: 1, color: '#a8c000' },
        ],
      });
      actionBtn.bg.roundRect(0, 0, CONTENT_W, BTN_H, 11).fill(grad);
      actionBtn.text.text = 'Bet';
      actionBtn.text.style.fill = C.accentDark;
      actionBtn.text.style.fontSize = BTN_FONT;
      actionBtn.container.alpha = (cooldown || playLock) ? 0.5 : 1;
    }

    // Random button
    randomBtn.container.alpha = playing ? 1 : 0.4;

    // Disable bet input/buttons during play
    const betDisabled = playing || ar;
    halfBtn.container.alpha = betDisabled ? 0.35 : 1;
    doubleBtn.container.alpha = betDisabled ? 0.35 : 1;
    diffBox.alpha = playing ? 0.45 : 1;

    // Tab disabling
    manualTab.container.alpha = ar ? 0.4 : 1;
    autoTab.container.alpha = playing ? 0.4 : 1;

    // Auto tab
    autoBetValueLabel.text = fmt(autoS.autoBet);
    autoBetText.text = fmtBet(autoS.autoBet);
    autoDiffText.text = autoS.autoDiff;
    autoBalValue.text = fmt(balance);

    // Cashout row
    const maxRow = DIFF[autoS.autoDiff]?.rows ?? 9;
    cashoutRowValue.text = autoS.autoCashoutRow === 0 ? 'Disabled' : `Row ${autoS.autoCashoutRow} / ${maxRow}`;
    cashoutRowValue.style.fill = autoS.autoCashoutRow === 0 ? C.labelColor : C.gold;
    cashoutRowInput.valueText.text = autoS.autoCashoutRow === 0 ? '' : String(autoS.autoCashoutRow);

    // Number of bets
    const isInfinite = autoS.autoCount === 0;
    numBetsValue.text = isInfinite ? '∞ Infinite' : `${autoS.autoCount} rounds`;
    numBetsValue.style.fill = isInfinite ? C.gold : C.valueColor;
    numBetsInput.valueText.text = isInfinite ? '' : String(autoS.autoCount);

    // On Win/Loss buttons
    winResetBtn.bg.clear().roundRect(0, 0, 60, 30, 6).fill({ color: autoS.onWinMode === 'reset' ? 0x33333a : C.bg });
    winIncBtn.bg.clear().roundRect(0, 0, 72, 30, 6).fill({ color: autoS.onWinMode === 'increase' ? 0x33333a : C.bg });
    lossResetBtn.bg.clear().roundRect(0, 0, 60, 30, 6).fill({ color: autoS.onLossMode === 'reset' ? 0x33333a : C.bg });
    lossIncBtn.bg.clear().roundRect(0, 0, 72, 30, 6).fill({ color: autoS.onLossMode === 'increase' ? 0x33333a : C.bg });

    // Stop profit/loss
    stopProfitInput.valueText.text = autoS.stopProfit ? String(autoS.stopProfit) : '';
    stopLossInput.valueText.text = autoS.stopLoss ? String(autoS.stopLoss) : '';

    // Auto action button
    if (ar) {
      autoActionBtn.bg.clear().roundRect(0, 0, CONTENT_W, BTN_H, 11).fill({ color: 0x4a0a0a });
      autoActionBtn.text.text = '⏹ Stop Autobet';
      autoActionBtn.text.style.fill = 0xffaaaa;
    } else {
      autoActionBtn.bg.clear();
      const grad = new PIXI.FillGradient({
        type: 'linear', start: { x: 0, y: 0 }, end: { x: 1, y: 0 }, textureSpace: 'local',
        colorStops: [
          { offset: 0, color: '#a8c000' },
          { offset: 0.5, color: '#eaff00' },
          { offset: 1, color: '#a8c000' },
        ],
      });
      autoActionBtn.bg.roundRect(0, 0, CONTENT_W, BTN_H, 11).fill(grad);
      autoActionBtn.text.text = '▶ Start Autobet';
      autoActionBtn.text.style.fill = C.accentDark;
    }
    autoActionBtn.container.alpha = (playing && !ar) ? 0.5 : 1;

    // Session profit / rounds
    sessionProfitRow.visible = ar;
    roundsRow.visible = ar;
    if (ar) {
      spValue.text = (atp >= 0 ? '+' : '') + fmt(atp);
      spValue.style.fill = atp >= 0 ? C.green : C.red;
      rlValue.text = isInfinite ? '∞' : String(ac);
    }

    // Auto disable states
    autoHalfBtn.container.alpha = ar ? 0.35 : 1;
    autoDoubleBtn.container.alpha = ar ? 0.35 : 1;
    autoDiffBox.alpha = ar ? 0.45 : 1;
  };

  // ── Cooldown on game state change ──
  useGameStore.subscribe((state, prev) => {
    if (state.gstate !== prev.gstate && state.gstate !== 'playing') {
      cooldown = true;
      setTimeout(() => { cooldown = false; }, 1000);
    }
  });

  const destroy = () => {
    // Remove overlay inputs
    ['desktop-bet-input', 'desktop-auto-bet-input', 'desktop-cashout-row-input',
     'desktop-num-bets-input', 'desktop-stop-profit-input', 'desktop-stop-loss-input'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
    container.destroy({ children: true });
  };

  return { container, update, destroy };
}
