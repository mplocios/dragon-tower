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