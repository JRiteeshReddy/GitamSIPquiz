export interface ItemConfig {
  id: number;
  src: string;
  alt: string;
  cx: number;
  cy: number;
  x: number;
  y: number;
  rotation: number;
  isTarget: boolean;
}

export interface RoundConfig {
  leftItems: ItemConfig[];
  rightItems: ItemConfig[];
}

export type GameState = 'lobby' | 'playing' | 'round_end' | 'game_over';

export interface PlayerScore {
  name: string;
  score: number;
}

// Messages sent from Host to Client
export type HostMessage = 
  | { type: 'GAME_STATE'; state: GameState }
  | { type: 'ROUND_CONFIG'; config: RoundConfig }
  | { type: 'ROUND_RESULT'; message: string; isWin: boolean }
  | { type: 'LEADERBOARD'; players: PlayerScore[] }
  | { type: 'TIMER_SYNC'; timeLeft: number };

// Messages sent from Client to Host
export type ClientMessage = 
  | { type: 'JOIN'; name: string }
  | { type: 'ITEM_CLICKED'; isTarget: boolean };
