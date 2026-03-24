const KEY = 'dragon_session';
const BALANCE_KEY = 'dragon_balance';
const HISTORY_KEY = 'dragon_history';
const MAX_HISTORY = 50;

export const saveSession = (data: object) => {
  localStorage.setItem(KEY, JSON.stringify(data));
};

export const loadSession = () => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

export const clearSession = () => localStorage.removeItem(KEY);

export const saveBalance = (balance: number) => {
  localStorage.setItem(BALANCE_KEY, JSON.stringify(balance));
};

export const loadBalance = () => {
  try {
    const raw = localStorage.getItem(BALANCE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

export const clearBalance = () => localStorage.removeItem(BALANCE_KEY);

export const saveHistoryEntry = (entry: object) => {
  const history = loadHistory();
  history.unshift(entry);
  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
};

export const loadHistory = (): any[] => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

export const clearHistory = () => localStorage.removeItem(HISTORY_KEY);

// ── Settings persistence ──────────────────────────────────
const SETTINGS_KEY = 'dragon_settings';

export interface GameSettings {
  volume: number;
  maxBet: boolean;
  instantBet: boolean;
  hotkeysEnabled: boolean;
  animations: boolean;
  autoPattern: (number | null)[];
}

const DEFAULT_SETTINGS: GameSettings = {
  volume: 80,
  maxBet: false,
  instantBet: false,
  hotkeysEnabled: false,
  animations: true,
  autoPattern: Array(9).fill(null),
};

export const saveSettings = (settings: Partial<GameSettings>) => {
  const current = loadSettings();
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...settings }));
};

export const loadSettings = (): GameSettings => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch { return DEFAULT_SETTINGS; }
};
