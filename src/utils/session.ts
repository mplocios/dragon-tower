const KEY = 'dragon_session';
const BALANCE_KEY = 'dragon_balance';

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

// ── Game History ──────────────────────────────────────────────
const HISTORY_KEY = 'dragon_history';
const FAVORITES_KEY = 'dragon_favorites';
const MAX_HISTORY = 50;

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

// ── Favorites ─────────────────────────────────────────────────
export const isFavorite = (): boolean => {
  return localStorage.getItem(FAVORITES_KEY) === 'true';
};

export const toggleFavorite = (): boolean => {
  const next = !isFavorite();
  localStorage.setItem(FAVORITES_KEY, String(next));
  return next;
};