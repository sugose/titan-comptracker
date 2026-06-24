# Changelog

All notable changes to titan-comptracker are documented here.

## [Unreleased]

### Fixed
- Removed conflicting Expo scaffold files (app/(tabs)/, app/modal.tsx) that caused render error on launch (PR #11)
- Pinned react, react-dom, and react-test-renderer to exact 19.1.0 to match react-native 0.81.5 bundled renderer (PR #13)

## [0.1.0] — 2026-06-24

### Added
- Initial project setup
- PBI-1.1: Match schedule service and game card — footballDataService, Match/Venue/GameCardProps types, time zone utilities with full 2026 World Cup host city lookup, and GameCard component
- PBI-1.2: Competition select screen and match schedule screen — FIFA World Cup 2026 tile navigates to scrollable GameCard list with dual time zone display
