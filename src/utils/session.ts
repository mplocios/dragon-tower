// ── Favorites (app-level, used by screen wrapper) ────────────
const FAVORITES_KEY = 'dragon_favorites';

export const isFavorite = (): boolean => {
  return localStorage.getItem(FAVORITES_KEY) === 'true';
};

export const toggleFavorite = (): boolean => {
  const next = !isFavorite();
  localStorage.setItem(FAVORITES_KEY, String(next));
  return next;
};
