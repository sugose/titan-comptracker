const GAME_STATE_MAP: Record<string, string> = {
  SCHEDULED: "UPCOMING",
  TIMED: "UPCOMING",
  IN_PLAY: "ONGOING",
  PAUSED: "ONGOING",
  LIVE: "ONGOING",
  FINISHED: "FINISHED",
  POSTPONED: "POSTPONED",
  CANCELLED: "CANCELLED",
  SUSPENDED: "SUSPENDED",
};

export function gameStateLabel(apiStatus: string): string {
  return GAME_STATE_MAP[apiStatus] ?? apiStatus;
}

export function showScore(displayLabel: string): boolean {
  return displayLabel === "ONGOING" || displayLabel === "FINISHED";
}
