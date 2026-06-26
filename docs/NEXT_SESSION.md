# Next Session Queue

PBIs queued for upcoming work, in no particular priority order.

---

## PBI: APK Versioning

Tie APK version to git tags so every install is traceable to a specific source commit. Approach: tag commits with semantic version (e.g. v1.0.1), pull tag into build pipeline so APK is labelled accordingly.

---

## PBI: Landing / About Screen

A startup screen displayed when the app launches. Should show: app name, version, author, repo URL. Design TBD — keep it simple.

---

## PBI: Carousel Improvements

Continue polishing the Reanimated magnifying glass carousel on the FlatMatchSchedule path. Specific improvements TBD when we get there.

---

## PBI: Feature Flag — Old Carousel

Use the legacy carousel (original non-Reanimated implementation) as a real-world feature flagging exercise. Default to new implementation; flag toggles back to old one. Goal is to learn feature flagging in practice before removing the old code.

---

## PBI: Remove Old Carousel Implementation

Once the feature flag exercise is complete, delete the legacy carousel code. FlatMatchSchedule / Reanimated is the target architecture going forward.

---

## PBI: iOS Port

Explore porting titan-comptracker to iOS. React Native / Expo stack should make this largely reusable — investigate what platform-specific work is needed.

---

### PBI: .env.example + README Update
Create a `.env.example` file in the repo root showing required environment variables without actual values. Update README to document that cloners need their own football-data.org API key and how to obtain one.

### PBI: Pluggable Data Providers
Introduce a provider abstraction layer with a normalized canonical internal data model (Competition, Match, Team, etc.). Each external API (football-data.org, API-Football, etc.) implements the interface and maps its response to the canonical structure. Support multiple simultaneous providers. Per-competition provider configuration — each competition maps to its configured provider. Future note: cross-provider data assembly (e.g. odds from a third provider) is a later step not in scope here.

### PBI: Translation Service (New Project)
Standalone backend service that handles translation as a responsibility. Clients (e.g. titan-comptracker) send a bundle of strings and a target language; the service translates (via AI or third-party API), caches results internally, and returns the translated bundle. Clients do no caching themselves. Tests the ai-project-template on a networked backend architecture — a new project type.

### PBI: Multi-Language Support for titan-comptracker
Add i18n support to titan-comptracker. Language selection persisted via AsyncStorage, device locale as fallback. Note: depends on translation service PBI above — titan-comptracker would consume the translation service rather than using static files or a direct third-party API.

### PBI: Update Presentation Closing Slide
Add the shoe-tying closing line to the titan-comptracker conference presentation (`building-with-ai-presentation.md` in `sugose/db0-docs`). Suggested placement: final conclusions slide or closing slide. Line: "I contributed the things I'm good at. Claude contributed the things it excels at. Together we can tie almost any shoes."
