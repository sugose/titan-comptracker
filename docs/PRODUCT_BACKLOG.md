# Product Backlog — titan-comptracker

## Status Key

| Symbol | Meaning |
|---|---|
| ⬜ | Not started |
| 🔄 | In progress |
| ✅ | Done (merged to main) |

---

## Epic 1 — Foundation & Live Data

| ID | Description | Status | Branch | PR |
|---|---|---|---|---|
| PBI-1.1 | Match schedule service and game card (FIFA World Cup 2026) | ✅ | feature/pbi-1-1-match-schedule-service-and-game-card | #4 |
| PBI-1.2 | Competition select screen and match schedule screen | ✅ | feature/pbi-1-2-competition-select-and-match-schedule-screens | #9 |

---

## Epic 2 — Carousel & Competition UI

| ID | Description | Status | Branch | PR |
|---|---|---|---|---|
| PBI-2.1 | Carousel TPS spec | ✅ | docs/carousel-tps | #15 |
| PBI-2.2 | GameCardCompact / GameCardFocused carousel split | ✅ | feature/pbi-2-2-carousel-card-split | #16 |
| PBI-2.3 | Smart initial focus and venue time removal | ✅ | feature/pbi-2-3-smart-initial-focus | #17 |
| PBI-2.4 | Full competition select screen (12 competitions) | ✅ | feature/pbi-2-4-competition-select | #18 |
| PBI-2.5 | Auto-scroll to initially focused card on load | ✅ | feature/pbi-2-5-auto-scroll | #19 |
| PBI-2.6 | Match events on focused card | ✅ | feature/pbi-2-6-match-events | #20 |
| PBI-2.7 | Team crests via expo-image, tap-to-focus | ✅ | feature/pbi-2-7-team-crests | #21 |
| PBI-2.8 | SVG crest support fix | ✅ | fix/pbi-2-8-svg-crests | #22 |
| PBI-2.9 | Animated focus transition (Animated.parallel, scale) | ✅ | feature/pbi-2-9-animated-focus | #23 |
| PBI-2.10 | UX improvements (rate limit, season status, reload button removal) | ✅ | feature/pbi-2-10-ux-improvements | #24 |

---

## Decision Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-06-24 | React Native / Expo SDK 54 | Android primary, iOS secondary; Expo managed workflow reduces native config overhead |
| 2026-06-24 | Biome for lint/format | Unified tool, fast, zero config for TypeScript projects |
| 2026-06-24 | jest-expo for testing | Native integration with Expo SDK; no extra bridging needed |
| 2026-06-24 | football-data.org API | Free tier available; covers FIFA World Cup 2026 data |
| 2026-06-24 | Disabled git core.autocrlf on Windows | Windows autocrlf=true caused Biome CRLF/LF conflicts; disabled globally and stabilised with biome format --write |
| 2026-06-24 | Removed Expo scaffold tab/modal files | app/(tabs)/ and app/modal.tsx conflicted with our Expo Router entry point causing render error; removed in PR #11 |
| 2026-06-24 | Pinned React to 19.1.0 | react-native 0.81.5 bundles react-native-renderer 19.1.0; React must match exactly; fixed in PR #13 |
| 2026-06-24 | Added adb to Git Bash PATH permanently | Android SDK platform-tools not on PATH by default on Windows; added to ~/.bashrc |
| 2026-06-24 | Venue local time removed from GameCardFocused | football-data.org free tier does not return venue city/country at match level; getVenueTimeZone always falls back to UTC |
| 2026-06-24 | Team crests use expo-image not React Native Image | expo-image supports SVG URLs returned by football-data.org; React Native Image does not |
| 2026-06-24 | Animated focus transition uses Animated not Reanimated | Initial implementation used RN Animated; rearchitecture to Reanimated continuous scroll-driven approach identified as needed follow-up (too twitchy/binary) |
