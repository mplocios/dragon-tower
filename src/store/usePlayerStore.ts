import { create } from "zustand";

export type GameMode = "demo" | "real";

/** Demo balance used when no API is connected */
const DEMO_BALANCE = 100000.23;

const DEMO_STORAGE_KEY = "player_demo";

// ── Demo persistence (localStorage) ─────────────────────
function loadDemo(): { balance: number } {
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    if (!raw) return { balance: DEMO_BALANCE };
    const parsed = JSON.parse(raw);
    return { balance: parsed.balance ?? DEMO_BALANCE };
  } catch {
    return { balance: DEMO_BALANCE };
  }
}

function saveDemo(balance: number) {
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify({ balance }));
}

// ── Real persistence (API) ──────────────────────────────
// TODO: Replace with actual API calls
async function fetchRealBalance(): Promise<number> {
  // 🔌 API: GET /api/user/balance
  // For now return 0 until API is connected
  return 0;
}

async function saveRealBalance(_balance: number): Promise<void> {
  // 🔌 API: POST /api/user/balance  { balance }
  // No-op until API is connected
}

// ── Mode persistence ────────────────────────────────────
const MODE_KEY = "player_mode";

function loadMode(): GameMode {
  try {
    const v = localStorage.getItem(MODE_KEY);
    return v === "real" ? "real" : "demo";
  } catch {
    return "demo";
  }
}

function saveMode(mode: GameMode) {
  localStorage.setItem(MODE_KEY, mode);
}

// ── Init ────────────────────────────────────────────────
const initMode = loadMode();
const initBalance = initMode === "demo" ? loadDemo().balance : 0;

export interface PlayerStore {
  // ── Player info ──
  name: string;
  balance: number;
  mode: GameMode;
  playing: boolean;

  // ── Actions ──
  setName: (v: string) => void;
  setBalance: (v: number) => void;
  setMode: (v: GameMode) => void;
  setPlaying: (v: boolean) => void;
  /** Call on app load to fetch real balance from API */
  initRealBalance: () => Promise<void>;
}

export const usePlayerStore = create<PlayerStore>()((set, get) => ({
  name: "Player",
  balance: initBalance,
  mode: initMode,
  playing: false,
  setName: (v) => set({ name: v }),
  setBalance: (v) => {
    const { mode } = get();
    if (mode === "demo") {
      saveDemo(v);
    } else {
      saveRealBalance(v);
    }
    set({ balance: v });
  },
  setMode: (v) => {
    saveMode(v);
    if (v === "demo") {
      set({ mode: v, balance: loadDemo().balance });
    } else {
      // Real mode — set 0 for now, initRealBalance will fetch from API
      set({ mode: v, balance: 0 });
    }
  },
  setPlaying: (v) => set({ playing: v }),
  initRealBalance: async () => {
    if (get().mode !== "real") return;
    const balance = await fetchRealBalance();
    set({ balance });
  },
}));

export { DEMO_BALANCE };
