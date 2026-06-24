# Dev Infrastructure — titan-comptracker

## Stack

| Layer | Choice | Version |
|---|---|---|
| Framework | React Native / Expo (managed workflow) | Expo SDK 54 |
| Language | TypeScript | 5.x (bundled with Expo SDK 54) |
| Linter / Formatter | Biome | 1.9.4 |
| Test framework | jest-expo | SDK 54 compatible |
| Component testing | @testing-library/react-native | Latest compatible with SDK 54 |
| Navigation | Expo Router | v4 (included in SDK 54) |
| CI | GitHub Actions | — |
| Package manager | npm | Bundled with Node 22 |

---

## Local Environment Setup

### Prerequisites

- Node.js 22 LTS — https://nodejs.org
- npm (bundled with Node)
- Android Studio (for Android emulator) or a physical Android device with Expo Go
- GitHub CLI (`gh`) — https://cli.github.com
- Claude Code CLI: `npm install -g @anthropic-ai/claude-code`

### First-time setup

```bash
git clone https://github.com/sugose/titan-comptracker.git
cd titan-comptracker
npm ci
```

### Running on Android

```bash
npx expo start --android
```

Or scan the QR code with Expo Go on a physical device.

### Running tests

```bash
npx jest --coverage
```

### Lint and format check

```bash
npx biome ci .
```

### Format (auto-fix)

```bash
npx biome format --write .
```

---

## CI/CD — GitHub Actions

File: `.github/workflows/ci.yml`

Triggers:
- Every push to any branch
- Every pull request targeting `main`

Steps:
1. Checkout
2. Set up Node 22
3. `npm ci`
4. `npx biome ci .` — lint and format check
5. `npx tsc --noEmit` — type check
6. `npx jest --passWithNoTests` — tests (coverage gate added once first real tests exist)

The required status check for branch protection is named `build`. PRs cannot merge until this passes.

---

## Environment Variables

All secrets and environment configuration live in `.env` at the project root. This file is gitignored and never committed.

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_API_KEY` | API key for football-data.org |
| `EXPO_PUBLIC_API_BASE_URL` | Base URL: https://api.football-data.org/v4 |

Use the `EXPO_PUBLIC_` prefix for any variable that needs to be accessible in client-side code.

**Rate limiting:** football-data.org enforces request limits. Always inspect response headers (`X-RequestCounter-Reset`, `X-Requests-Available`) and back off automatically if limits are approached.

---

## Project Structure

```
titan-comptracker/
├── app/                    # Expo Router screens (file-based navigation)
├── src/
│   ├── components/         # Reusable UI components
│   ├── services/           # API and data service modules
│   ├── hooks/              # Custom React hooks
│   ├── types/              # Shared TypeScript interfaces and types
│   └── utils/              # Pure utility functions
├── __tests__/              # Jest tests mirroring src/ structure
├── docs/                   # Project documentation
├── tools/                  # Dev tooling scripts (dump.sh, pr_dump.sh)
├── .github/
│   ├── workflows/ci.yml
│   └── copilot-instructions.md
├── CLAUDE.md
├── CHANGELOG.md
├── .env                    # Secrets (gitignored)
├── app.json
├── biome.json
├── tsconfig.json
└── package.json
```

---

## Tools

### `tools/dump.sh`

Dumps full project context for starting a new Clead session. Run from project root:

```bash
bash tools/dump.sh
```

Output is written to `tools/dumps/<timestamp>.txt`. Paste the contents into a new Claude chat to resume a Clead session.

### `tools/pr_dump.sh`

Dumps full PR context for Clead review:

```bash
bash tools/pr_dump.sh <PR-number>           # code PRs
bash tools/pr_dump.sh <PR-number> --no-src  # docs/tooling PRs
```
