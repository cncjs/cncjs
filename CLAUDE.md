# CLAUDE.md

## Project: cncjs

CNC machine controller — Node.js/Express backend + React frontend communicating over Socket.IO.

**Stack:**
- Frontend: React 15.6 (class components), Redux, React Router 4, Stylus, Three.js (visualizer)
- Backend: Node.js ≥18, Express 4, Socket.IO 2
- Build: Webpack 5, Babel 7, Yarn

**Key commands:**
```
yarn dev          # dev server (Webpack + Express, concurrent)
yarn build        # production build
yarn lint         # ESLint + Stylint + i18n validation
yarn eslint       # ESLint only (src/**/*.js, src/app/**/*.jsx)
yarn test         # Jest (Node env, 10s timeout)
```

**Structure:**
- `src/app/` — React frontend (widgets, containers, styles, i18n)
- `src/server/` — Express backend, machine controllers (Grbl/Marlin/Smoothie/TinyG)
- `src/lib/` — Shared logic, 3D viz utilities
- `grbl-simulator/` — Grbl simulator used in tests

**Conventions:**
- JavaScript only — no TypeScript, no `.ts`/`.tsx` files
- Webpack alias `@app` → `src/app`
- Stylus for all styles (no CSS modules, no Sass)
- i18next for all user-facing strings (frontend and server)
- ESLint extends `trendmicro` config

---

## Guidelines

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.
