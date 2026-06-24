# Next Session

## Priority 1 — Now button debug (carry-over bug)

The Now button still does not scroll to the correct position on device despite PR #35 (nowScrollPendingRef + deferred scroll in onMeasured). The architecture is correct in theory but the behaviour on device is wrong.

### Debug plan
1. Open chrome://inspect in Chrome on dev machine
2. Connect Android device via USB with USB debugging enabled
3. Attach to Hermes JS debugger for the running Expo Go session
4. Set breakpoints in:
   - `handleNow` — inspect `state.matches`, `nowIndex`, `cardLayouts.current` at press time
   - `onMeasured` — inspect `nowScrollPendingRef.current`, `index`, `currentFocusRef.current`, computed `y`
5. Press Now button, step through, identify where the scroll goes wrong

### Hypothesis to verify
- Is `onMeasured` actually firing for the target card after Now is pressed?
- Is `nowScrollPendingRef.current` still true when `onMeasured` fires?
- Is `index === currentFocusRef.current` matching correctly?
- What value does `computeScrollOffset` return at that moment?

## Priority 2 — Backlog items

- PBI-2.14: Auto-refresh for ONGOING matches — poll `getMatchDetail` on an interval while a live match is focused
- Favourite teams feature — not yet specced, will need its own epic
