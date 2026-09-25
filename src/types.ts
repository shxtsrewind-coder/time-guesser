export type GameMode = 'classic' | 'daily';

export interface RoundInfo {
  round_no: number;
  image_url: string;
  ask_location: boolean;
  ask_weekday: boolean;
  max_score?: number;
  answered: boolean;
}

export interface StartGameResponse {
  game_id: string;
  mode: GameMode;
  current_round: number;
  resumed: boolean;
  rounds: RoundInfo[];
}

export interface SubmitGuessResponse {
  round_no: number;
  guess_year: number;
  true_year: number;
  difference: number;
  year_score: number;
  actual_lat: number | null;
  actual_lng: number | null;
  guess_lat: number | null;
  guess_lng: number | null;
  distance_km: number | null;
  location_score: number | null;
  taken_on: string | null;
  actual_weekday_name: string | null;
  guess_weekday: number | null;
  weekday_score: number | null;
  score: number;
  round_max: number;
  total_score: number;
  max_total: number;
  caption: string;
  fun_fact?: string;
  credit?: string;
  source_url?: string;
  license?: string;
  is_last: boolean;
}

export interface FinishGameResponse {
  total_score: number;
  max_score: number;
  round_scores: Array<{
    round_no: number;
    score: number;
    max_score?: number;
    year_score?: number;
    location_score?: number;
    weekday_score?: number;
  }>;
  rank?: number;
  players?: number;
}

export interface DailyLeaderboardRow {
  rank: number;
  display_name: string;
  total_score: number;
}

export interface AllTimeLeaderboardRow {
  rank: number;
  display_name: string;
  best_score: number;
}

export type ScreenState = 
  | 'home'
  | 'round'
  | 'round_result'
  | 'final_results'
  | 'leaderboard';
