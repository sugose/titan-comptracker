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
