import type { Competition } from "../../src/types/competition";
import { getCompetitionGroup, sortCompetitions } from "../../src/utils/competitionSort";

const TODAY = new Date("2026-06-25T12:00:00Z");

function makeComp(code: string, startDate: string, endDate: string): Competition {
  return {
    id: Math.random(),
    code,
    name: code,
    area: "World",
    currentSeason: { startDate, endDate, currentMatchday: null },
  };
}

function makeCompNoSeason(code: string): Competition {
  return { id: Math.random(), code, name: code, area: "World", currentSeason: null };
}

// Active: 2026-06-01 to 2026-07-31 (today 2026-06-25 is inside)
const ACTIVE_A = makeComp("ACT_A", "2026-06-01", "2026-07-31");
// Active ending sooner than ACTIVE_A
const ACTIVE_B = makeComp("ACT_B", "2026-06-01", "2026-07-10");
// Completed: ended 2026-05-31
const COMPLETED_A = makeComp("COMP_A", "2026-01-01", "2026-05-31");
// Completed more recently
const COMPLETED_B = makeComp("COMP_B", "2026-01-01", "2026-06-20");
// Upcoming: starts 2026-09-01
const UPCOMING_A = makeComp("UP_A", "2026-09-01", "2027-05-31");
// Upcoming starting sooner
const UPCOMING_B = makeComp("UP_B", "2026-08-01", "2027-04-30");
// No season
const NO_SEASON = makeCompNoSeason("NO_SEASON");

describe("getCompetitionGroup", () => {
  it("returns 'active' when today is within season dates", () => {
    expect(getCompetitionGroup(ACTIVE_A, TODAY)).toBe("active");
  });

  it("returns 'completed' when season has ended", () => {
    expect(getCompetitionGroup(COMPLETED_A, TODAY)).toBe("completed");
  });

  it("returns 'upcoming' when season has not started", () => {
    expect(getCompetitionGroup(UPCOMING_A, TODAY)).toBe("upcoming");
  });

  it("returns 'upcoming' when competition has no currentSeason", () => {
    expect(getCompetitionGroup(NO_SEASON, TODAY)).toBe("upcoming");
  });
});

describe("sortCompetitions — group order", () => {
  it("active competitions sort before completed", () => {
    const sorted = sortCompetitions([COMPLETED_A, ACTIVE_A], new Set(), TODAY);
    expect(sorted.indexOf(ACTIVE_A)).toBeLessThan(sorted.indexOf(COMPLETED_A));
  });

  it("completed sort before upcoming", () => {
    const sorted = sortCompetitions([UPCOMING_A, COMPLETED_A], new Set(), TODAY);
    expect(sorted.indexOf(COMPLETED_A)).toBeLessThan(sorted.indexOf(UPCOMING_A));
  });

  it("active sorts before completed sorts before upcoming", () => {
    const sorted = sortCompetitions([UPCOMING_A, COMPLETED_A, ACTIVE_A], new Set(), TODAY);
    expect(sorted[0]).toBe(ACTIVE_A);
    expect(sorted[1]).toBe(COMPLETED_A);
    expect(sorted[2]).toBe(UPCOMING_A);
  });
});

describe("sortCompetitions — within active", () => {
  it("favourited active before non-favourited", () => {
    const sorted = sortCompetitions([ACTIVE_A, ACTIVE_B], new Set(["ACT_A"]), TODAY);
    expect(sorted[0]).toBe(ACTIVE_A);
  });

  it("sorted by days remaining ASC (ending soonest first)", () => {
    // ACTIVE_B ends 2026-07-10, ACTIVE_A ends 2026-07-31 — B should come first
    const sorted = sortCompetitions([ACTIVE_A, ACTIVE_B], new Set(), TODAY);
    expect(sorted[0]).toBe(ACTIVE_B);
    expect(sorted[1]).toBe(ACTIVE_A);
  });
});

describe("sortCompetitions — within completed", () => {
  it("favourited completed before non-favourited", () => {
    const sorted = sortCompetitions([COMPLETED_A, COMPLETED_B], new Set(["COMP_A"]), TODAY);
    expect(sorted[0]).toBe(COMPLETED_A);
  });

  it("sorted by most recently finished first (daysSinceEnd ASC)", () => {
    // COMPLETED_B ended 2026-06-20 (5 days ago), COMPLETED_A ended 2026-05-31 (25 days ago)
    const sorted = sortCompetitions([COMPLETED_A, COMPLETED_B], new Set(), TODAY);
    expect(sorted[0]).toBe(COMPLETED_B);
    expect(sorted[1]).toBe(COMPLETED_A);
  });
});

describe("sortCompetitions — within upcoming", () => {
  it("favourited upcoming before non-favourited", () => {
    const sorted = sortCompetitions([UPCOMING_A, UPCOMING_B], new Set(["UP_A"]), TODAY);
    expect(sorted[0]).toBe(UPCOMING_A);
  });

  it("sorted by soonest starting first (daysUntilStart ASC)", () => {
    // UPCOMING_B starts 2026-08-01, UPCOMING_A starts 2026-09-01 — B first
    const sorted = sortCompetitions([UPCOMING_A, UPCOMING_B], new Set(), TODAY);
    expect(sorted[0]).toBe(UPCOMING_B);
    expect(sorted[1]).toBe(UPCOMING_A);
  });

  it("competition with no currentSeason goes at the very bottom", () => {
    const sorted = sortCompetitions([NO_SEASON, UPCOMING_A], new Set(), TODAY);
    expect(sorted[sorted.length - 1]).toBe(NO_SEASON);
  });
});
