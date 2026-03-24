import { create } from "zustand";
import {
  Difficulty,
  GameState,
  RealGameState,
  TileContent,
  HistoryEntry,
  AutoSettings,
} from "../types";
import { INITIAL_BET } from "../constants";
import { loadHistory, saveHistoryEntry, loadSettings, saveSettings } from "../utils/session";
import { usePlayerStore } from "../../../store/usePlayerStore";

// ── Session game-ID counter ──────────────────────────────────
let _counter = 0;

// ── Store shape ──────────────────────────────────────────────
export type GameMode = 'demo' | 'real';

export interface GameStore {
  // core game state
  testMode: boolean;
  mode: GameMode;
  balance: number;
  bet: number;
  diff: Difficulty;
  gstate: GameState;
  rgstate: RealGameState;
  curRow: number;
  curMult: number;
  curWin: number;
  toast: string | null;
  tower: TileContent[][];
  revealed: Record<number, Record<number, TileContent>>;
  gameId: string;
  gameStartTime: number;
  history: HistoryEntry[];
  playLock: boolean;

  volume: number;
  setVolume: (v: number) => void;
  maxBet: boolean;
  setMaxBet: (v: boolean) => void;
  instantBet: boolean;
  setInstantBet: (v: boolean) => void;
  hotkeysEnabled: boolean;
  setHotkeysEnabled: (v: boolean) => void;
  animations: boolean;
  setAnimations: (v: boolean) => void;

  // auto-bet state
  auto: AutoSettings;
  autoRunning: boolean;
  autoLastRoundWon: boolean;
  autoTotalProfit: number;
  autoCount: number;
  autoIsInfinite: boolean;
  autoPattern: (number | null)[];

  // ── actions ────────────────────────────────────────────────
  setTestMode: (v: boolean) => void;
  setMode: (v: GameMode) => void;
  setBalance: (v: number) => void;
  setBet: (v: number) => void;
  setDiff: (v: Difficulty) => void;
  setGstate: (v: GameState) => void;
  setRgstate: (v: RealGameState) => void;
  setCurRow: (v: number) => void;
  setCurMult: (v: number) => void;
  setCurWin: (v: number) => void;
  setToast: (msg: string | null) => void;
  setTower: (tower: TileContent[][]) => void;
  setRevealed: (revealed: Record<number, Record<number, TileContent>>) => void;
  revealTile: (r: number, c: number, content: TileContent) => void;
  newGameId: () => void;
  setPlayLock: (v: boolean) => void;
  setHistory: (entries: HistoryEntry[]) => void;
  addHistoryEntry: (entry: HistoryEntry) => void;
  setAuto: (partial: Partial<AutoSettings>) => void;
  setAutoRunning: (v: boolean) => void;
  setAutoLastRoundWon: (v: boolean) => void;
  setAutoTotalProfit: (v: number) => void;
  setAutoCount: (v: number) => void;
  setAutoIsInfinite: (v: boolean) => void;
  setAutoPattern: (row: number, col: number | null) => void;
  clearAutoPattern: () => void;
  resetRound: () => void;
}

// ── Store creation ───────────────────────────────────────────
const _savedSettings = loadSettings();

export const useGameStore = create<GameStore>()((set) => ({
  // ── initial state ──────────────────────────────────────────
  testMode: usePlayerStore.getState().mode === 'demo',
  mode: usePlayerStore.getState().mode,
  balance: usePlayerStore.getState().balance,
  bet: INITIAL_BET,
  diff: "Medium",
  gstate: "idle",
  rgstate: "newgame",
  curRow: 0,
  curMult: 1,
  curWin: 0,
  toast: null,
  tower: [],
  revealed: {},
  gameId: "",
  gameStartTime: 0,
  history: loadHistory(),
  playLock: false,
  volume: _savedSettings.volume,
  maxBet: _savedSettings.maxBet,
  instantBet: _savedSettings.instantBet,
  hotkeysEnabled: _savedSettings.hotkeysEnabled,
  animations: _savedSettings.animations,

  auto: {
    autoBet: 5,
    autoCount: 10,
    autoAdvanced: false,
    onWinMode: "reset",
    onLossMode: "reset",
    winInc: 0,
    lossInc: 0,
    stopProfit: 0,
    stopLoss: 0,
    autoDiff: "Medium",
  autoCashoutRow: 0,
  },
  autoRunning: false,
  autoLastRoundWon: false,
  autoTotalProfit: 0,
  autoCount: 10,
  autoIsInfinite: false,
  autoPattern: _savedSettings.autoPattern,

  // ── actions ────────────────────────────────────────────────
  setTestMode: (v) => set({ testMode: v }),
  setMode: (v) => set({ mode: v }),
  setBalance: (v) => set({ balance: v }),
  setBet: (v) => set({ bet: v }),
  setDiff: (v) => set({ diff: v }),
  setGstate: (v) => set({ gstate: v }),
  setRgstate: (v) => set({ rgstate: v }),
  setCurRow: (v) => set({ curRow: v }),
  setCurMult: (v) => set({ curMult: v }),
  setCurWin: (v) => set({ curWin: v }),
  setToast: (msg) => set({ toast: msg }),
  setTower: (tower) => set({ tower }),
  setRevealed: (revealed) => set({ revealed }),

  revealTile: (r, c, content) =>
    set((state) => {
      const newRevealed = { ...state.revealed };
      if (!newRevealed[r]) {
        newRevealed[r] = {};
      } else {
        newRevealed[r] = { ...newRevealed[r] };
      }
      newRevealed[r][c] = content;
      return { revealed: newRevealed };
    }),

  newGameId: () =>
    set({
      gameId: `game_${Date.now()}_${++_counter}`,
      gameStartTime: Date.now(),
    }),

  setPlayLock: (v) => set({ playLock: v }),
  setVolume: (v) => { set({ volume: v }); saveSettings({ volume: v }); },
  setMaxBet: (v) => { set({ maxBet: v }); saveSettings({ maxBet: v }); },
  setInstantBet: (v) => { set({ instantBet: v }); saveSettings({ instantBet: v }); },
  setHotkeysEnabled: (v) => { set({ hotkeysEnabled: v }); saveSettings({ hotkeysEnabled: v }); },
  setAnimations: (v) => { set({ animations: v }); saveSettings({ animations: v }); },

  setHistory: (entries) => set({ history: entries }),

  addHistoryEntry: (entry) =>
    set((state) => {
      saveHistoryEntry(entry);
      const newHistory = [entry, ...state.history].slice(0, 50);
      return { history: newHistory };
    }),

  setAuto: (partial) =>
    set((state) => ({
      auto: { ...state.auto, ...partial },
    })),

  setAutoRunning: (v) => set({ autoRunning: v }),
  setAutoLastRoundWon: (v) => set({ autoLastRoundWon: v }),
  setAutoTotalProfit: (v) => set({ autoTotalProfit: v }),
  setAutoCount: (v) => set({ autoCount: v }),
  setAutoIsInfinite: (v) => set({ autoIsInfinite: v }),

  setAutoPattern: (row, col) =>
    set((state) => {
      const newPattern = [...state.autoPattern];
      if (col === null) {
        for (let r = row; r < newPattern.length; r++) {
          newPattern[r] = null;
        }
      } else {
        newPattern[row] = col;
      }
      saveSettings({ autoPattern: newPattern });
      return { autoPattern: newPattern };
    }),

  clearAutoPattern: () => {
    set({ autoPattern: Array(9).fill(null) });
    saveSettings({ autoPattern: Array(9).fill(null) });
  },

  resetRound: () =>
    set({
      curRow: 0,
      curMult: 1,
      curWin: 0,
      revealed: {},
      tower: [],
    }),
}));

// ── Sync game balance → global balance store ─────────────
useGameStore.subscribe(
  (state, prev) => {
    if (state.balance !== prev.balance) {
      usePlayerStore.getState().setBalance(state.balance);
    }
    if (state.mode !== prev.mode) {
      usePlayerStore.getState().setMode(state.mode);
    }
    if (state.gstate !== prev.gstate) {
      usePlayerStore.getState().setPlaying(state.gstate === 'playing');
    }
  }
);

useGameStore.subscribe((state) => {
  if (typeof state.setMaxBet !== "function") {
    console.log("💀 STORE BROKEN:", state);
  }
});

export default useGameStore;
