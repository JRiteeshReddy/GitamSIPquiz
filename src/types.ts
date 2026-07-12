export type GameState = 'lobby' | 'starting' | 'playing' | 'round_end' | 'game_over';

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

export interface PlayerScore {
  name: string;
  score: number;
}

// Messages sent from Host to Client
export type HostMessage = 
  | { type: 'GAME_STATE'; state: GameState }
  | { type: 'LEADERBOARD'; players: PlayerScore[] }
  | { type: 'TIMER_SYNC'; timeLeft: number }
  | { type: 'COUNTDOWN_SYNC'; count: number };

// Messages sent from Client to Host
export type ClientMessage = 
  | { type: 'JOIN'; name: string }
  | { type: 'SCORE_UPDATE'; points: number };
