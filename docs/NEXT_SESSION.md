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
