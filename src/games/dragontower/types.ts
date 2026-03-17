export type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Expert' | 'Master';
export type GameState = 'idle' | 'playing' | 'ended';
export type RealGameState = 'newgame' | 'playagain' | 'endgame';
export type TileContent = 'egg' | 'dragon' | 'egg_dim' | null;
export type TileState = 'idle' | 'active' | 'inactive' | 'hover' | 'egg' | 'egg_dim' | 'dragon';

export interface DiffConfig {
  cols: number;
  eggs: number;
  heads: number;
  rows: number;
}

export interface GameStateSnapshot {
  gstate: GameState;
  rgstate: RealGameState;
  curRow: number;
  curMult: number;
  curWin: number;
  balance: number;
  bet: number;
  diff: Difficulty;
  tower: TileContent[][];
  revealed: Record<number, Record<number, TileContent>>;
}

export interface ResultInfo {
  type: 'win' | 'lose';
  amount: number;
  mult: number;
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  difficulty: Difficulty;
  bet: number;
  result: 'win' | 'lose';
  multiplier: number;
  payout: number;
  profit: number;
  rowsCleared: number;
}
