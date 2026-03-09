export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert' | 'master';

interface DifficultyConfig {
  tilesPerRow: number;
  safeCount: number;
  multiplier: number;
}

const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  easy: { tilesPerRow: 6, safeCount: 5, multiplier: 1.2 },
  medium: { tilesPerRow: 5, safeCount: 3, multiplier: 1.5 },
  hard: { tilesPerRow: 5, safeCount: 2, multiplier: 2.0 },
  expert: { tilesPerRow: 4, safeCount: 2, multiplier: 2.5 },
  master: { tilesPerRow: 4, safeCount: 1, multiplier: 3.0 },
};

export interface Tile {
  id: string;
  isSafe: boolean;
  isRevealed: boolean;
}

export interface GameState {
  difficulty: Difficulty;
  currentLevel: number;
  tiles: Tile[];
  gameActive: boolean;
  won: boolean;
  currentMultiplier: number;
  selectedTileId: string | null;
}

export function generateTiles(difficulty: Difficulty): Tile[] {
  const config = DIFFICULTY_CONFIGS[difficulty];
  const safePositions = new Set<number>();

  while (safePositions.size < config.safeCount) {
    safePositions.add(Math.floor(Math.random() * config.tilesPerRow));
  }

  return Array.from({ length: config.tilesPerRow }).map((_, index) => ({
    id: `tile-${index}`,
    isSafe: safePositions.has(index),
    isRevealed: false,
  }));
}

export function initializeGame(difficulty: Difficulty): GameState {
  return {
    difficulty,
    currentLevel: 0,
    tiles: generateTiles(difficulty),
    gameActive: true,
    won: false,
    currentMultiplier: 1.0,
    selectedTileId: null,
  };
}

export function selectTile(state: GameState, tileId: string): GameState {
  const tile = state.tiles.find((t) => t.id === tileId);
  if (!tile) return state;

  const newTiles = state.tiles.map((t) =>
    t.id === tileId ? { ...t, isRevealed: true } : t
  );

  if (!tile.isSafe) {
    return {
      ...state,
      tiles: newTiles,
      gameActive: false,
      won: false,
      selectedTileId: tileId,
    };
  }

  const config = DIFFICULTY_CONFIGS[state.difficulty];
  const newLevel = state.currentLevel + 1;
  const newMultiplier = state.currentMultiplier * config.multiplier;

  return {
    ...state,
    currentLevel: newLevel,
    currentMultiplier: newMultiplier,
    tiles: newTiles,
    selectedTileId: tileId,
  };
}

export function nextLevel(state: GameState): GameState {
  return {
    ...state,
    tiles: generateTiles(state.difficulty),
    selectedTileId: null,
  };
}

export function getVisibleTiles(tiles: Tile[]): Tile[] {
  const revealedSafeCount = tiles.filter((t) => t.isRevealed && t.isSafe).length;

  return tiles.map((tile) => {
    if (tile.isRevealed) {
      return tile;
    }

    if (revealedSafeCount === 0) {
      return tile;
    }

    const dragonTiles = tiles.filter((t) => !t.isSafe && !t.isRevealed);
    return {
      ...tile,
      isSafe: dragonTiles.length > 0 ? false : tile.isSafe,
    };
  });
}
