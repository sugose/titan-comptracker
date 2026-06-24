export interface Venue {
  name: string;
  city: string;
  country: string;
}

export interface Match {
  id: number;
  utcDate: string;
  status: "SCHEDULED" | "LIVE" | "IN_PLAY" | "PAUSED" | "FINISHED" | "POSTPONED" | "CANCELLED";
  homeTeam: string;
  awayTeam: string;
  venue: Venue;
}

export interface GameCardProps {
  match: Match;
  deviceTimeZone: string;
}
