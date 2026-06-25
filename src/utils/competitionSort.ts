import type { Competition } from "../types/competition";

export type CompetitionGroup = "active" | "completed" | "upcoming";

export function getCompetitionGroup(competition: Competition, today: Date): CompetitionGroup {
  if (!competition.currentSeason) return "upcoming";
  const start = new Date(competition.currentSeason.startDate);
  const end = new Date(competition.currentSeason.endDate);
  if (today >= start && today <= end) return "active";
  if (today > end) return "completed";
  return "upcoming";
}

export function sortCompetitions(
  competitions: Competition[],
  favourites: Set<string>,
  today: Date = new Date(),
): Competition[] {
  const active: Competition[] = [];
  const completed: Competition[] = [];
  const upcoming: Competition[] = [];

  for (const c of competitions) {
    const group = getCompetitionGroup(c, today);
    if (group === "active") active.push(c);
    else if (group === "completed") completed.push(c);
    else upcoming.push(c);
  }

  const daysRemaining = (c: Competition) => {
    if (!c.currentSeason) return Number.MAX_SAFE_INTEGER;
    const end = new Date(c.currentSeason.endDate);
    return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const daysSinceEnd = (c: Competition) => {
    if (!c.currentSeason) return 0;
    const end = new Date(c.currentSeason.endDate);
    return Math.ceil((today.getTime() - end.getTime()) / (1000 * 60 * 60 * 24));
  };

  const daysUntilStart = (c: Competition) => {
    if (!c.currentSeason) return Number.MAX_SAFE_INTEGER;
    const start = new Date(c.currentSeason.startDate);
    return Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const favFirst = (a: Competition, b: Competition) => {
    const aFav = favourites.has(a.code) ? 0 : 1;
    const bFav = favourites.has(b.code) ? 0 : 1;
    return aFav - bFav;
  };

  active.sort((a, b) => favFirst(a, b) || daysRemaining(a) - daysRemaining(b));
  completed.sort((a, b) => favFirst(a, b) || daysSinceEnd(a) - daysSinceEnd(b));
  upcoming.sort((a, b) => favFirst(a, b) || daysUntilStart(a) - daysUntilStart(b));

  return [...active, ...completed, ...upcoming];
}
