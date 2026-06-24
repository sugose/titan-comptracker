export interface Venue {
  name: string;
  city: string;
  country: string;
}

export interface Match {
  id: number;
  utcDate: string;
  status:
    | "SCHEDULED"
    | "TIMED"
    | "LIVE"
    | "IN_PLAY"
    | "PAUSED"
    | "FINISHED"
    | "POSTPONED"
    | "CANCELLED"
    | "SUSPENDED";
  homeTeam: string;
  awayTeam: string;
  venue: Venue;
  score?: {
    home: number | null;
    away: number | null;
  };
}

export interface GameCardProps {
  match: Match;
  deviceTimeZone: string;
}

export interface Season {
  startDate: string;
  endDate: string;
  currentMatchday: number | null;
}

export interface Competition {
  id: number;
  code: string;
  name: string;
  area: string;
  currentSeason: Season | null;
}
