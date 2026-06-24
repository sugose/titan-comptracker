# Changelog

All notable changes to titan-comptracker are documented here.

## [Unreleased]

## [0.2.0] — 2026-06-24

### Fixed
- Removed conflicting Expo scaffold files (app/(tabs)/, app/modal.tsx) that caused render error on launch (PR #11)
- Pinned react, react-dom, and react-test-renderer to exact 19.1.0 to match react-native 0.81.5 bundled renderer (PR #13)

### Added
- PBI-2.1: Carousel TPS spec — documented GameCardCompact/GameCardFocused split, scroll-based focus detection, animated transition, event fetching behaviour, and initial focus logic in docs/TECHNICAL_PRODUCT_SPECIFICATION.md (PR #15)
- PBI-2.2: GameCardCompact and GameCardFocused components — vertical carousel with scroll-driven focus detection; focused card shows venue, events section, extended info; compact card shows team names, kick-off time, game state badge, score (PR #16)
- PBI-2.3: Smart initial focus — on load, carousel focuses first ONGOING match, then first UPCOMING, then index 0; venue local time removed from GameCardFocused (free tier returns no venue location data) (PR #17)
- PBI-2.4: Competition select screen — full list of 12 free-tier competitions from football-data.org API, sorted by area then name, with season year range, matchday, and season status display (PR #18)
- PBI-2.5: Auto-scroll on load — carousel scrolls to centre the initially focused card after layout completes (PR #19)
- PBI-2.6: Match events on focused card — fetches match detail for ONGOING and FINISHED matches; shows goals, bookings, substitutions sorted by minute; loading indicator while fetching; snap-to-centre on focus change (PR #20)
- PBI-2.7: Team crests — fetches crest URLs via teamService; displayed via expo-image next to team names in both card variants; tap-to-focus on compact cards (PR #21)
- PBI-2.8: SVG crest support — switched from React Native Image to expo-image to support SVG crest URLs returned by football-data.org (PR #22)
- PBI-2.9: Animated focus transition — scale 0.92→1.0 / 1.0→0.92 over 350ms using Easing.out(Easing.cubic) via Animated.parallel; one Animated.Value per card held in ref (PR #23)
- PBI-2.10: UX improvements — 429 rate limit error handling with user-facing message; season status on competition tiles ("Season starts…", "The season starts TODAY!", "Matchday X"); reload button removed from focused card (PR #24)

## [0.1.0] — 2026-06-24

### Added
- Initial project setup
- PBI-1.1: Match schedule service and game card — footballDataService, Match/Venue/GameCardProps types, time zone utilities with full 2026 World Cup host city lookup, and GameCard component
- PBI-1.2: Competition select screen and match schedule screen — FIFA World Cup 2026 tile navigates to scrollable GameCard list with dual time zone display
