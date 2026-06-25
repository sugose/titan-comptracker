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
    CompetitionTile.tsx   # Tappable tile for a single competition
    FlatMatchSchedule.tsx # Flat (non-carousel) match list for favourited competitions
    GameCard.tsx          # Single match card component (legacy, superceded by carousel cards)
    GameCardCompact.tsx   # Out-of-focus carousel card
    GameCardFocused.tsx   # In-focus carousel card
  services/
    competitionService.ts  # football-data.org competitions API client
    footballDataService.ts # football-data.org matches API client
    matchDetailService.ts  # football-data.org single match detail API client
    teamService.ts         # football-data.org team crest lookup
  types/
    competition.ts        # Competition, Season, Match, Venue types
  utils/
    gameState.ts          # API status → display label mapping
    time.ts               # Time zone formatting utilities
```

### Data Flow

1. App opens → CompetitionSelectScreen calls `competitionService.getCompetitions()` on mount; also loads favourites and filter state from AsyncStorage
2. Service fetches from `GET /v4/competitions`, filters to 12 free tier codes, sorts by area then name
3. Screen renders a top bar with Favourites filter button, then a `ScrollView` of `CompetitionTile` components; favourited competitions are sorted to the top; when filter is active only favourited competitions are shown
4. User taps a tile → navigates to `MatchScheduleScreen` with the competition code and `isFavourite` query param (`"true"` or `"false"`)
5. MatchScheduleScreen calls `footballDataService.getMatches(competitionCode)` on mount
6. Response is typed, validated, and returned as `Match[]`
7. Screen renders a vertical carousel of `GameCardFocused` / `GameCardCompact` components, sorted by UTC kick-off time ascending, with smart initial focus (ONGOING → UPCOMING → index 0)
8. On mount, the screen also calls `teamService.getTeamCrests(competitionCode)` to fetch team crest URLs; errors are silently ignored (crests are supplementary)
9. When the focused card is ONGOING or FINISHED, the screen fetches `matchDetailService.getMatchDetail(matchId)` and passes events to `GameCardFocused`

---

## Component Specs

### `CompetitionSelectScreen` — favourites feature

- **Top bar**: always visible when competitions are loaded; contains a single "Favourites" filter button (`testID="favourites-bar"`)
- **Filter button** (`testID="favourites-filter-button"`): outlined (border, transparent background) when inactive; filled (`#f0a500` background, dark text) when active
- **Sort order**: favourited competitions float to the top of the list; within each group the existing area-then-name sort from `competitionService` is preserved
- **Filter active**: list shows only favourited competitions; when no favourites are stored the list is empty (no message shown)
- **Star icon** on each `CompetitionTile` (`testID="favourite-star-{code}"`): outline `☆` (#888888) when not favourited; filled `★` (#f0a500) when favourited; tapping toggles state and re-sorts immediately; tapping the star does not navigate to the match schedule
- **Persistence**: favourite codes stored as JSON array under `AsyncStorage` key `"favouriteCompetitions"`; filter state stored as `"true"` or `"false"` string under key `"favouritesFilterActive"`; both loaded on mount; errors default to empty favourites and filter inactive

### `FlatMatchSchedule` component (PBI-3.2 / PBI-3.3 / PBI-3.4)

Used when `isFavourite === "true"` is passed to the match schedule screen. Renders a plain (non-Reanimated) scrollable list of matches.

Props:
```typescript
interface FlatMatchScheduleProps {
  matches: Match[];
  crests: Record<string, string>;
  matchEvents: Record<number, MatchEvent[] | null>;
  deviceTimeZone: string;
}
```

- All cards rendered as `GameCardFocused` wrapped in `MagnifiedCard` (Reanimated scale 0.85–1.0 based on scroll position)
- `Animated.ScrollView` + `useAnimatedRef`; `GestureDetector` (Pan) cancels `withTiming` on touch
- Fixed `CARD_HEIGHT = 220` for scroll offset calculation
- `testID="flat-top-bar"` on the top bar `View`
- Top bar contains three buttons left-to-right: Favourites, state filter cycle, Now
- **Favourites button** (`testID="flat-favourites-button"`): outlined default, filled when active; tap toggles `filterActive` + `foldOutOpen`
- **State filter button** (`testID="flat-state-filter-button"`): cycles All → Soon → Live → Played → All; session only
- **Now button** (`testID="flat-now-button"`): scrolls to `smartFocusIndex(displayedMatches)` using `runOnUI` + `withTiming` + `scrollTo`
- **Fold-out panel** (`testID="flat-favourites-foldout"`): shows unique teams from full match list; each row has `testID="favourite-team-row-{name}"` and `testID="favourite-team-checkbox-{name}"`; scrollable, max height 240px
- **AND-combined filter**: state filter AND favourites filter applied to produce `displayedMatches`; empty result shows empty list
- **Team favourites**: `AsyncStorage` key `"favouriteTeams"` (JSON array of team name strings); loaded on mount; saved on every toggle; default empty Set on read error; `filterActive` and `stateFilter` are session-only (not persisted)
- Exports `smartFocusIndex` for testability

### `GameCardFocused` — `favouriteTeams` prop (PBI-3.4)

Optional prop `favouriteTeams?: Set<string>`. When provided, renders an amber `★` (`testID="favourite-star-home-{matchId}"` / `testID="favourite-star-away-{matchId}"`) next to each team name that is in the set. No star rendered when prop is absent or team not in set.

### `teamService.getTeamCrests(competitionCode: string): Promise<Record<string, string>>`

- Fetches team list from `GET /v4/competitions/{competitionCode}/teams`
- Sets request header `X-Auth-Token: <EXPO_PUBLIC_API_KEY>`
- Inspects rate limit headers (same pattern as `footballDataService`)
- Returns `Record<teamName, crestUrl>` — maps `teams[].name` → `teams[].crest`
- Teams with null or undefined crest are omitted from the record
- Throws `RateLimitError`, `NetworkError`, `ApiError` on failure

### `matchDetailService.getMatchDetail(matchId: number): Promise<MatchDetail>`

- Fetches match detail from `GET /v4/matches/{matchId}`
- Sets request header `X-Auth-Token: <EXPO_PUBLIC_API_KEY>`
- Inspects rate limit headers (same pattern as `footballDataService`)
- Maps goals, bookings, and substitutions to typed `MatchEvent[]`
- Treats null goals/bookings/substitutions arrays from the API as empty arrays
- Determines HOME/AWAY team side by comparing `team.id` against `homeTeam.id`
- Sorts all events by minute ascending
- Throws `RateLimitError`, `NetworkError`, `ApiError` on failure
- Returns `MatchDetail` (extends `Match` with `events: MatchEvent[]`)

### `MatchDetail`, `MatchEvent` types

```typescript
interface GoalEvent {
  type: 'GOAL';
  minute: number;
  team: 'HOME' | 'AWAY';
  scorer: string;
}

interface BookingEvent {
  type: 'BOOKING';
  minute: number;
  team: 'HOME' | 'AWAY';
  player: string;
  card: 'YELLOW_CARD' | 'RED_CARD';
}

interface SubstitutionEvent {
  type: 'SUBSTITUTION';
  minute: number;
  team: 'HOME' | 'AWAY';
  playerOut: string;
  playerIn: string;
}

type MatchEvent = GoalEvent | BookingEvent | SubstitutionEvent;

interface MatchDetail extends Match {
  events: MatchEvent[];
}
```

### `competitionService.getCompetitions(): Promise<Competition[]>`

- Fetches competition list from `GET /v4/competitions`
- Sets request header `X-Auth-Token: <EXPO_PUBLIC_API_KEY>`
- Inspects rate limit headers after every call (same pattern as `footballDataService`)
- Filters response to the 12 free tier competition codes: WC, CL, EC, PL, ELC, FL1, BL1, SA, DED, PPL, PD, BSA
- Returns sorted `Competition[]` — sorted by area name ascending, then competition name ascending
- Throws `RateLimitError`, `NetworkError`, `ApiError` on failure

### `Competition` type

```typescript
interface Season {
  startDate: string;
  endDate: string;
  currentMatchday: number | null;
}

interface Competition {
  id: number;
  code: string;
  name: string;
  area: string;       // area.name from API
  currentSeason: Season | null;
}
```

### `CompetitionTile` component

Props: `{ competition: Competition; onPress: () => void }`

Displays:
- Competition name (large, prominent)
- Area (country/region, smaller, below name)
- Current season: start year – end year (e.g. "2025 – 2026"), if `currentSeason` is not null
- Current matchday (e.g. "Matchday 34"), if `currentMatchday` is not null
- Tapping the tile calls `onPress`

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
- Home team crest (if available) + home team name (left)
- Away team name + away team crest (if available) (right)
- Kick-off time in device local time zone
- Game state badge: UPCOMING / ONGOING / FINISHED (mapped from API status values)
- Score: shown if game state is ONGOING or FINISHED; hidden if UPCOMING
- Tapping the card sets it as the focused card (tap-to-focus), which triggers snap-to-centre

Props: `homeCrest?: string`, `awayCrest?: string`, `onPress?: () => void`

### In Focus Card
Full horizontal width. Height determined by content. Displays everything the out-of-focus card shows, plus:
- Venue name, city, country
- Match events (goals, bookings, substitutions) for ONGOING and FINISHED matches
- Reload button (🔄) in the top-right corner when events have been fetched

Props: `homeCrest?: string`, `awayCrest?: string`

Crest display: team crest image (20×20, resizeMode="contain") next to each team name. Home crest is left of the home team name; away crest is right of the away team name. If no crest URL is provided, the image is omitted (no placeholder).

Visual treatment: a "magnifying glass" effect — the card scales up and gains a visual depth treatment (subtle shadow, border glow, or scale transform) that distinguishes it from surrounding cards.

Note: venue local time is not displayed. The football-data.org free tier does not return venue city/country at the match level, so `getVenueTimeZone` always falls back to UTC. See Known Unknowns.

#### Events prop (`events?: MatchEvent[] | null`)

| Value | Behaviour |
|---|---|
| `undefined` | No events section shown (UPCOMING matches, or before first focus) |
| `null` | Small loading indicator shown below card content |
| `[]` | No events section shown (fetch succeeded, no events returned) |
| `MatchEvent[]` | Events rendered chronologically, home events left-aligned, away events right-aligned |

Event display format per row: `minute'` + icon/description
- GOAL: `⚽ [scorer]`
- BOOKING YELLOW_CARD: `🟨 [player]`
- BOOKING RED_CARD: `🟥 [player]`
- SUBSTITUTION: `↓ [playerOut] / ↑ [playerIn]`

### Animated Focus Transition (Reanimated)

Scale is driven continuously by scroll position using `react-native-reanimated`. Each card is wrapped in a `CardWrapper` that:
- Tracks its own `cardY` and `cardH` via `useSharedValue`
- Uses `useAnimatedStyle` + `interpolate` to compute `scale` based on distance between the card centre and the viewport centre
- Scale range: `0.88` (edge of screen) → `1.0` (centre of screen), clamped with `Extrapolation.CLAMP`

No `Animated.Value` or `Animated.parallel` — the animation is a pure function of `scrollY` (a `SharedValue<number>`).

### Top Navigation Bar

A thin bar rendered above the scroll view when matches are loaded (`status === "success"`).

- `testID="top-bar"` on the containing `View`
- Contains a "Now" button (`testID="now-button"`) — `TouchableOpacity`
- Pressing "Now" calls `smartFocusIndex(matches)` and scrolls to that card, replicating the initial focus logic: first ONGOING → first UPCOMING → index 0
- Not rendered during loading or error states

### Scroll Behaviour
- Smooth continuous scrolling — no snap/paging
- Card in the vertical centre of the visible area is considered "in focus"
- As the user scrolls, focus transitions smoothly between cards
- Out-of-focus cards peek above and below the focused card

### Event Fetching Behaviour

When a match card gains focus (on initial load or via scroll):
- If the match is ONGOING or FINISHED: fetch `getMatchDetail(match.id)` if not already cached
- While fetching: pass `events={null}` to `GameCardFocused` (shows loading indicator)
- On success: cache result and pass `events={detail.events}` to `GameCardFocused`
- On error: cache empty array (`events=[]`) — fail silently, events are supplementary
- If the match is UPCOMING: pass `events={undefined}` — no events section shown
- Cache key is `match.id`; each match is fetched at most once per screen mount

### Initial Focus on Load
When the match list loads, focus is set automatically:
1. First ONGOING match (IN_PLAY, PAUSED, or LIVE) — most relevant for live tracking
2. If none, first UPCOMING match (SCHEDULED or TIMED)
3. If neither, index 0 (first match in the sorted list)

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
