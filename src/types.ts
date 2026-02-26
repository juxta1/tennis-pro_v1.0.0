export interface Match {
  id: number;
  player1: string;
  player2: string;
  date: string;
  start_time: string | null; // "10:00"
  duration: number | null; // in minutes
  surface: string;
  season: string;
  score1: string | null; // "6,6"
  score2: string | null; // "4,2"
  status: 'scheduled' | 'completed';
}

export interface Stats {
  totalGames: number;
  matches: Match[];
}

export type SurfaceType = 'Clay' | 'Grass' | 'Hard' | 'Carpet';
