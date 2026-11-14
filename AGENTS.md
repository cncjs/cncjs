# CNCjs agent instructions

CNCjs controls CNC machines through a Node.js/Express server and a React
frontend connected with Socket.IO. It supports Grbl, Marlin, Smoothieware, and
TinyG, and also provides an Electron desktop application.

## Repository map

- `src/app/`: React frontend, widgets, styles, and translations.
- `src/server/`: server, controller implementations, and translations.
- `src/app/lib/` and `src/server/lib/`: frontend and server utilities.
- `src/electron-app/`: desktop integration.
- `grbl-simulator/`: simulator and its tests.
- `scripts/`: build and maintenance scripts.

## Development

- Use Yarn for dependency management. See `package.json` for scripts and
  `engines.node`; see the README supported-versions table for runtime support.
- `yarn dev` starts the development services; `yarn build` makes a production build.
- `yarn lint` checks translations, JavaScript, and styles.
- `yarn test` runs Jest; `yarn test:frontend` and `yarn test:e2e` cover the frontend.
- Use JavaScript, the `@app` alias, and the existing styling conventions.
  Localize user-facing frontend and server text using the existing i18n resources.
- When modifying React component interfaces, Tonic UI, or runtime boundaries, read
  [`.omp/RULES.md`](.omp/RULES.md) before editing.

## Skills

Task-specific procedures live in `skills/<name>/SKILL.md`. Read the matching
skill before doing that work; see [the skill catalog](skills/README.md).
