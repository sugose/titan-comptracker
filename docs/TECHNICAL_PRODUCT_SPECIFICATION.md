# Technical Product Specification — titan-comptracker

## System Overview

titan-comptracker is a React Native / Expo (SDK 54) mobile app for tracking sports competitions. The initial release supports a single competition — FIFA World Cup 2026 — and displays the full match schedule as a scrollable list of game cards. Android is the primary platform; iOS is secondary.

---

## Architecture

### Module Overview

```
app/
  index.tsx               # Entry point — renders CompetitionSelectScreen
  competition/
    [id].tsx              # Match schedule screen for a selected competition

src/
  components/
    GameCard.tsx          # Single match card component
  services/
    footballDataService.ts  # football-data.org API client
  types/
    competition.ts        # Competition, Match, Venue types
  utils/
    time.ts               # Time zone formatting utilities
```

### Data Flow

1. App opens → CompetitionSelectScreen renders a single selectable tile: FIFA World Cup 2026
2. User taps the tile → navigates to MatchScheduleScreen
3. MatchScheduleScreen calls `footballDataService.getMatches(competitionId)` on mount
4. Service fetches from `GET /v4/competitions/WC/matches` using `EXPO_PUBLIC_API_KEY`
5. Response is typed, validated, and returned as `Match[]`
6. Screen renders a `FlatList` of `GameCard` components, sorted by UTC kick-off time ascending
7. First match appears at top, last match at bottom — user scrolls down through the schedule

---

## Component Specs

### `footballDataService.getMatches(competitionId: string): Promise<Match[]>`

- Fetches match list from `GET /v4/competitions/{competitionId}/matches`
- Sets request header `X-Auth-Token: <EXPO_PUBLIC_API_KEY>`
- Inspects response headers after every call:
  - `X-Requests-Available` — if 0, do not make further requests until `X-RequestCounter-Reset`
  - `X-RequestCounter-Reset` — Unix timestamp when the counter resets
- Throws `RateLimitError` if rate limit is exhausted
- Throws `NetworkError` on fetch failure
- Throws `ApiError` on non-2xx response
- Returns validated `Match[]` on success

### `Match` type

```typescript
interface Venue {
  name: string;       // Arena name
  city: string;
  country: string;
}

interface Match {
  id: number;
  utcDate: string;    // ISO 8601 UTC kick-off time from API
  status: 'SCHEDULED' | 'LIVE' | 'IN_PLAY' | 'PAUSED' | 'FINISHED' | 'POSTPONED' | 'CANCELLED';
  homeTeam: string;
  awayTeam: string;
  venue: Venue;
}
```

### `GameCard` component

Props:
```typescript
interface GameCardProps {
  match: Match;
  deviceTimeZone: string;   // IANA time zone string from device (e.g. 'Europe/Stockholm')
}
```

Displays:
- Home team vs Away team
- Kick-off date and time in venue local time (derived from venue city/country)
- Kick-off date and time in device local time (derived from `deviceTimeZone`)
- Venue: arena name, city, country
- Match status badge (SCHEDULED / LIVE / FINISHED etc.)

Does not display scores in this iteration.

### `time.ts` utilities

- `formatInTimeZone(utcDate: string, timeZone: string): string` — formats a UTC ISO date string into a human-readable date/time in the given IANA time zone
- `getVenueTimeZone(city: string, country: string): string` — returns the IANA time zone for a known World Cup venue city. Hard-coded lookup table for all 2026 host cities (USA, Canada, Mexico). Returns `'UTC'` as fallback for unknown cities.

---

## Match Schedule Screen — Carousel Behaviour

### Overview
The match schedule screen renders matches as a vertical carousel. The card currently centred on screen is "in focus". All other cards are "out of focus". Scrolling is smooth and continuous — no hard paging. A vertical scrollbar is visible on the right edge.

### Out of Focus Card
Compact size — narrower and shorter than the focused card. Displays:
- Home team (left) vs Away team (right)
- Kick-off time in device local time zone
- Game state badge: UPCOMING / ONGOING / FINISHED (mapped from API status values)
- Score: shown if game state is ONGOING or FINISHED; hidden if UPCOMING

### In Focus Card
Full horizontal width. Height determined by content. Displays everything the out-of-focus card shows, plus:
- Venue name, city, country
Visual treatment: a "magnifying glass" effect — the card scales up and gains a visual depth treatment (subtle shadow, border glow, or scale transform) that distinguishes it from surrounding cards.

Note: venue local time is not displayed. The football-data.org free tier does not return venue city/country at the match level, so `getVenueTimeZone` always falls back to UTC. See Known Unknowns.

### Scroll Behaviour
- Smooth continuous scrolling — no snap/paging
- Card in the vertical centre of the visible area is considered "in focus"
- As the user scrolls, focus transitions smoothly between cards
- Out-of-focus cards peek above and below the focused card

### Game State Mapping

| API status | Display label |
|---|---|
| SCHEDULED | UPCOMING |
| TIMED | UPCOMING |
| IN_PLAY | ONGOING |
| PAUSED | ONGOING |
| LIVE | ONGOING |
| FINISHED | FINISHED |
| POSTPONED | POSTPONED |
| CANCELLED | CANCELLED |
| SUSPENDED | SUSPENDED |
| Unknown | raw value |

---

## Known Unknowns

- football-data.org free tier rate limit: 10 requests/minute. The schedule screen loads once on mount — this should be well within limits, but error handling for `RateLimitError` must be present from day one.
- Venue time zone mapping: the API does not return IANA time zones for venues. We will maintain a hard-coded lookup table of all 2026 host cities. This is a known limitation — if a city is missing from the table, we fall back to UTC and display a note.
- Match status values: the full set of statuses returned by the API may differ from what is documented. The `GameCard` must handle unknown status values gracefully (display the raw string rather than crashing).
- iOS testing: primary development and testing is on Android. iOS will be verified manually once the Android implementation is stable.
- Venue local time: the football-data.org free tier does not return venue city/country at the match level, so `getVenueTimeZone` always falls back to UTC. Venue local time display has been removed from `GameCardFocused` until structured venue location data is available. A future PBI may implement stadium-name-based timezone lookup as a workaround.
