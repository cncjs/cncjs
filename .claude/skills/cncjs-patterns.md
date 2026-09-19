---
name: cncjs-patterns
description: Coding patterns and conventions from cncjs repository
version: 1.0.0
source: local-git-analysis
analyzed_commits: 200
last_analyzed: 2026-02-10
---

# CNCjs Coding Patterns

> Auto-generated from git history analysis of cncjs repository

## Project Overview

**CNCjs** is a full-featured web-based interface for CNC controllers running Grbl, Marlin, Smoothieware, or TinyG.

- **Tech Stack**: React 16.14, Node.js 18+, Express, Socket.io, Electron
- **Build Tools**: Webpack 5, Babel 7, Jest 29
- **Package Manager**: Yarn (required)
- **Testing Framework**: Jest (migrated from tap in January 2026)

## Commit Conventions

This project **strictly follows conventional commits** with the following types (in order of frequency):

### Commit Types

| Type | Usage | Frequency | Examples |
|------|-------|-----------|----------|
| `chore` | Dependencies, releases, maintenance | 39% | `chore(deps): bump http-proxy-middleware from 2.0.7 to 2.0.9` |
| `feat` | New features | 38% | `feat: add Grbl v1.1 simulator (#950)` |
| `fix` | Bug fixes | 13% | `fix: resolve ESLint Babel parsing errors` |
| `build` | Build system changes | 8% | `build: update webpack config` |
| `docs` | Documentation updates | 5% | `docs: correct command for getting version` |
| `refactor` | Code restructuring | 4% | `refactor: migrate from tap to jest testing framework` |
| `ci` | CI/CD changes | 2% | `ci: add support for ARM-based macOS build` |
| `test` | Testing changes | 1% | `test: add grbl simulator tests` |

### Commit Scopes

Common scopes used in this project:

- **Controller-specific**: `(grbl)`, `(Grbl)`, `(grbl-simulator)`, `(Marlin)`, `(TinyG)`, `(Smoothie)`
- **UI components**: `(widgets/Axes)`, `(widgets/*)`, `(app)`
- **Internationalization**: `(l10n)`, `(i18n)`
- **Dependencies**: `(deps)`, `(deps-dev)`
- **Build/Release**: `(release)`, `(build)`

### Commit Message Format

```
<type>(<scope>): <description>

[optional body]

[optional footer with PR reference]
```

**Examples:**

```
feat(widgets/Axes): Replace GridSystem with flexbox layout in MDI component (#955)
fix: upgrade to @electron/rebuild for Python 3.12 compatibility (#949)
chore(release): publish 1.10.7
refactor(grbl-simulator): improve GRBL simulator functionality (#952)
```

### Pull Request Integration

- **56%** of commits include PR references (e.g., `(#952)`)
- PR numbers are included at the end of the commit message
- Format: `<type>(<scope>): <description> (#PR-number)`

## Code Architecture

### Directory Structure

```
cncjs/
├── src/
│   ├── app/              # Frontend React application
│   │   ├── api/          # API constants and utilities
│   │   ├── components/   # Reusable React components (PascalCase)
│   │   ├── containers/   # Container components
│   │   ├── i18n/         # Internationalization (multi-language support)
│   │   │   ├── en/       # English translations
│   │   │   ├── zh-cn/    # Simplified Chinese
│   │   │   ├── zh-tw/    # Traditional Chinese
│   │   │   ├── ja/       # Japanese
│   │   │   ├── es/       # Spanish
│   │   │   └── ...       # 15+ languages supported
│   │   ├── lib/          # Client-side utilities
│   │   └── widgets/      # Widget components
│   │       ├── Axes/
│   │       ├── Marlin/
│   │       ├── Grbl/
│   │       ├── TinyG/
│   │       ├── Smoothie/
│   │       └── Visualizer/
│   ├── server/           # Backend Node.js server
│   │   ├── controllers/  # CNC controller implementations
│   │   │   ├── Grbl/     # Grbl controller + line parsers
│   │   │   ├── Marlin/   # Marlin controller + line parsers
│   │   │   ├── Smoothie/ # Smoothie controller + line parsers
│   │   │   ├── TinyG/    # TinyG controller + line parsers
│   │   │   └── utils/    # Controller utilities
│   │   ├── config/       # Server configuration
│   │   └── lib/          # Server utilities
│   └── electron-app/     # Electron desktop application
│       ├── menu-template.darwin.js  # macOS menu
│       ├── menu-template.default.js # Default menu
│       └── AutoUpdater.js
├── grbl-simulator/       # GRBL simulator for testing
├── scripts/              # Build and utility scripts
└── tests/                # Test fixtures

```

### Naming Conventions

- **React Components**: PascalCase (e.g., `ModalTemplate`, `InlineError`, `FormGroup`)
- **Utilities**: kebab-case (e.g., `normalize-range.js`, `promise-series.js`)
- **Controllers**: PascalCase with suffix (e.g., `GrblController.js`, `MarlinController.js`)
- **Line Parsers**: `{Controller}LineParser{Type}.js` (e.g., `GrblLineParserResultOk.js`)

## Workflows

### 1. Adding a New Feature

**Pattern detected from commits:**

1. Create feature branch (often tied to issue/PR number)
2. Implement feature with appropriate scope in commit message
3. Include PR number in commit message
4. Update relevant i18n files if UI text is added

**Example commit sequence:**

```bash
feat(widgets/Axes): Replace GridSystem with flexbox layout in MDI component (#955)
```

### 2. Dependency Updates

**Pattern detected: High frequency of dependency updates**

- Format: `chore(deps): bump <package> from <old-version> to <new-version> (#PR)`
- Always includes PR reference
- `package.json` and `yarn.lock` updated together

**Example:**

```bash
chore(deps): bump @babel/runtime from 7.20.13 to 7.27.6 (#923)
```

### 3. Release Workflow

**Pattern detected:**

1. Version bump in `package.json` and `src/package.json`
2. Commit: `chore(release): publish <version>`
3. Git tag with version number

**Recent releases:**

```
chore(release): publish 1.10.7  (2026-01-25)
chore(release): publish 1.10.6  (2026-01-17)
chore(release): publish 1.10.5  (earlier)
```

### 4. Controller Development

**Pattern for adding/modifying CNC controllers:**

1. Update main controller file (e.g., `src/server/controllers/Grbl/GrblController.js`)
2. Update line parsers if needed (e.g., `GrblLineParserResultOk.js`)
3. Update corresponding widget in `src/app/widgets/{Controller}/`
4. Add tests in `src/server/controllers/{Controller}/__tests__/`

**Most frequently modified controllers:**

- `src/server/controllers/Grbl/GrblController.js` (16 changes)
- `src/server/controllers/Marlin/MarlinController.js` (13 changes)
- `src/server/controllers/TinyG/TinyGController.js` (12 changes)
- `src/server/controllers/Smoothie/SmoothieController.js` (12 changes)

### 5. Internationalization Workflow

**Pattern detected: Batch updates to i18n files**

When adding new UI strings:

1. Add English translation to `src/app/i18n/en/resource.json`
2. Update all other language files (often in same commit)
3. Scope: `feat(l10n)` or `feat(i18n)`

**Supported languages (15+):**

- `en`, `zh-cn`, `zh-tw`, `ja`, `es`, `fr`, `de`, `it`, `pt-br`, `ru`, `tr`, `nl`, `hu`, `cs`, `uk`, and more

## Testing Patterns

### Testing Framework: Jest

**Migration**: Migrated from tap to Jest in January 2026

```bash
refactor: migrate from tap to jest testing framework
```

### Test File Organization

**Test location pattern:**

```
src/server/**/__tests__/**/*.test.js
grbl-simulator/__tests__/**/*.test.js
```

**Examples:**

```
src/server/lib/__tests__/Sender.test.js
src/server/controllers/Grbl/__tests__/GrblRunner.test.js
src/server/controllers/Marlin/__tests__/MarlinRunner.test.js
src/server/lib/__tests__/evaluate-expression.test.js
grbl-simulator/__tests__/grbl-simulator.test.js
```

### Jest Configuration

From `package.json`:

```json
{
  "jest": {
    "testMatch": [
      "<rootDir>/src/server/**/__tests__/**/*.test.js",
      "<rootDir>/grbl-simulator/__tests__/**/*.test.js",
      "<rootDir>/src/app/widgets/Visualizer/__tests__/**/*.test.js"
    ],
    "collectCoverageFrom": [
      "<rootDir>/src/server/**/*.js",
      "!<rootDir>/src/server/**/*.test.js",
      "!<rootDir>/src/server/**/__tests__/**"
    ],
    "testEnvironment": "node",
    "testTimeout": 10000
  }
}
```

### Running Tests

```bash
yarn test              # Run all tests with coverage
yarn eslint            # Lint JavaScript files
yarn lint              # Run all linters (eslint, stylint, i18nlint)
```

### Pre-Push Hooks

Configured to run `eslint-debug` before push:

```json
"pre-push": ["eslint-debug"]
```

## Build System

### Build Scripts

```bash
yarn build           # Production build (alias for build-prod)
yarn build-dev       # Development build
yarn build-prod      # Production build
yarn dev             # Development mode with hot reload
```

### Electron Build

**Platform-specific builds:**

```bash
yarn build:macos         # macOS x64 + ARM64
yarn build:macos-x64     # macOS Intel
yarn build:macos-arm64   # macOS Apple Silicon
yarn build:linux         # Linux all architectures
yarn build:linux-x64     # Linux x64
yarn build:linux-arm64   # Linux ARM64
yarn build:windows       # Windows x64
```

### Development Workflow

```bash
# Start development environment
yarn dev

# This runs concurrently:
# 1. start-app-dev    - Webpack dev server (port 8080)
# 2. start-server-dev - CNCjs server (port 8000)
```

## Code Style Guidelines

### Linting

**Three linters configured:**

1. **ESLint** - JavaScript/JSX linting
   - Config: `eslint-config-trendmicro`
   - Plugins: `import`, `jsx-a11y`, `react`, `jest`

2. **Stylint** - Stylus linting
   - For `.styl` files in `src/app`

3. **i18nlint** - JSON linting for i18n files
   - Validates all `src/{app,server}/i18n/**/*.json` files

### Running Linters

```bash
yarn lint           # Run all linters
yarn eslint         # ESLint only
yarn stylint        # Stylint only
yarn i18nlint       # i18n JSON linting only
```

## File Co-Change Patterns

Files that frequently change together:

1. **Dependencies**: `package.json` + `yarn.lock` (always together)
2. **Dual package files**: `package.json` + `src/package.json`
3. **Controllers + Tests**: Controller files + their `__tests__/` counterparts
4. **i18n batch updates**: Multiple language files updated together
5. **Widget + Controller**: `src/app/widgets/{X}/` + `src/server/controllers/{X}/`

## Technology-Specific Patterns

### React Patterns

- **React version**: 16.14.2 — staged up from 15.6; 17/18/19 are still ahead
- **Component style**: Class components (pre-hooks era)
- **State management**: none. No Redux, no context store — widgets keep their
  own state and persist it through `app/store`, a localStorage-backed
  ImmutableStore. `react-redux` and `react-router-redux` were declared
  dependencies for years and never imported once; they have been removed.
- **Routing**: React Router v4
- **Styling**: Styled Components v3.4 + Stylus
- **3D**: three.js 0.186, driven imperatively rather than through
  react-three-fiber, so the Visualizer does not depend on the React version

### Backend Patterns

- **Framework**: Express.js
- **Real-time**: Socket.io for WebSocket communication
- **Authentication**: JWT with express-jwt
- **Serial communication**: SerialPort library
- **Logging**: Winston + universal-logger

### Build Patterns

- **Bundler**: Webpack 5
- **Transpiler**: Babel 7
- **Hot reload**: React Refresh (Fast Refresh)
- **Polyfills**: core-js, regenerator-runtime

## Common Dependencies

### Frontend

```
react ~16.14.0
react-router-dom ~4.3.1
styled-components ~3.4.9
socket.io-client ~2.2.0
three ~0.186.0
```

### Backend

```
express ~4.16.4
socket.io ~2.2.0
serialport ^10.0.0
winston ~3.14.1
jsonwebtoken ~9.0.0
```

### Development

```
webpack ~5.94.0
@babel/core ^7.26.0
jest ^29.3.1
electron ~22.0.3
eslint ^8.0.0
```

## Project-Specific Notes

### Multi-Controller Support

This project supports **4 major CNC controllers**:

1. **Grbl** - Most popular, most commits
2. **Marlin** - 3D printer firmware adapted for CNC
3. **Smoothieware** - ARM-based controller
4. **TinyG** - Atmel-based controller

Each controller has:
- Server-side controller class
- Line parser implementations
- Frontend widget
- Test suite

### Internationalization Focus

- **15+ languages** supported
- i18n files frequently updated (10 commits each for major languages)
- Dedicated i18n linter to validate JSON files
- Uses `i18next` ecosystem

### Desktop + Web Architecture

- **Web**: Standard web server with REST API and WebSockets
- **Desktop**: Electron wrapper around the web app
- **Build targets**: macOS (Intel + ARM), Linux (x64, ARM64, ARMv7), Windows (x64)

## Anti-Patterns to Avoid

Based on git history analysis:

1. **Don't mix concerns** - Keep controller, widget, and i18n changes in separate commits when possible
2. **Don't skip PR references** - 56% of commits have PR numbers; this is the project standard
3. **Don't forget i18n** - When adding UI text, update all language files (or at least `en`)
4. **Don't modify lock files manually** - Always use `yarn add/remove/upgrade`
5. **Don't skip tests** - Controllers should have corresponding test coverage

## Migration Notes

### Recent Migrations

1. **Testing framework** (Jan 2026): tap → Jest
   - Update test files to use Jest syntax
   - Use `__tests__/` directory pattern
   - Run with `yarn test`

2. **Build modernization** (2025): Webpack 4 → Webpack 5
   - Updated to Fast Refresh for React hot reload
   - Added polyfill packages explicitly

3. **Node.js version**: Minimum required is Node 18+

---

*Auto-generated by /skill-create on 2026-02-10*
*Analyzed 200 commits from cncjs repository*
