# End-to-end smoke tests

These specs exist to catch regressions that the Jest suite structurally cannot
see: `jest.testMatch` only covers `src/server/**` and `grbl-simulator/**`, so
every one of the ~41k lines under `src/app` is otherwise unverified.

They are deliberately shallow. The goal is to notice when a dependency upgrade
stops a widget from mounting, blanks a settings pane, or starts throwing in the
console — not to assert on business logic.

## Running

The suite tests a server that is already running; it does not start one.

```bash
yarn dev          # or: yarn win-dev on Windows
yarn test:e2e     # in another shell
```

Point it at a different instance with `CNCJS_URL`:

```bash
CNCJS_URL=http://192.168.0.50:8000 yarn test:e2e
```

First run needs the browser binary:

```bash
npx playwright install chromium
```

The project pins the `chromium` channel rather than the default headless
shell, because the shell ships without WebGL and the Visualizer widget needs it
to produce a canvas.

## What is covered

- **workspace.spec.js** — the app boots, all 15 widgets in the default layout
  mount, the axes readout renders, the Three.js canvas is drawn, the
  xterm-backed console constructs, the connection widget lists every supported
  controller.
- **settings.spec.js** — each of the 8 settings sections resolves and paints,
  and navigation between them stays client-side.

## What is not covered

Anything requiring a machine: jogging, G-code streaming, probing, homing. Those
need a controller on a serial port and, more importantly, they move real
hardware — they belong in a separate, explicitly opt-in tier.

## Selector conventions

- Widgets are addressed through `[data-widget-id="..."]`, which the widget
  containers already render.
- Settings content is scoped through `settingsSection()` in `fixtures.js`. This
  matters: `containers/App.jsx` keeps the workspace mounted under
  `display: none` while settings are open, so an unscoped `table` or `form`
  selector silently matches hidden workspace nodes.
- CSS module class names are built as `[path][name]__[local]--[hash]` in both
  the development and production webpack configs, so matching on the path
  prefix is stable across builds even though the hash is not.

## Console assertions

`fixtures.js` collects console errors, uncaught exceptions and failed requests,
and `expectNoPageErrors()` asserts all three are empty. Two filter lists keep
that assertion honest rather than permanently red:

- dev-server noise — the HMR client dials `:8000/ws` while webpack-dev-server
  listens on `:8080`, and `eslint-webpack-plugin` pipes lint warnings through
  the browser console;
- requests that may legitimately fail — chiefly `*.hot-update.json`, which a
  page already open requests after a rebuild has invalidated its hash.

Add to these lists only for noise that genuinely carries no application signal.
Everything else should be fixed in the app instead.

## Hardware tier

`e2e/hardware/` drives a real controller over a serial port. It is skipped
unless `CNCJS_TEST_PORT` names one, so `yarn test:e2e` stays runnable on a
machine with nothing plugged in.

```bash
CNCJS_TEST_PORT=COM3 yarn test:e2e --project=hardware
```

**These specs move the machine.** Each jog is symmetric — every test returns
the axis to where it started, and nothing touches the work coordinate system
(no `G10`, no `G92`) — but with a controller wired to a powered machine, the
axes physically move by the jog step currently selected in the keypad. Check
your clearances before running it, and remember that a Grbl with `$20=0`,
`$21=0` and `$22=0` has no soft limits, no hard limits and no homing, so
nothing in firmware will stop an over-travel.

That symmetry depends entirely on `jog()` waiting for the move to land rather
than for the controller to report Idle. Right after the click the command has
not left the browser, so the controller is still Idle and a state-based wait
returns immediately — the spec then ends, the page is torn down mid-move, and
the return leg never reaches the machine. An early version of this helper did
exactly that and left X a millimetre off origin. If you change `jog()`, verify
afterwards that the machine is back where it started **and** reports Idle, not
Run.

This tier exists because the smoke tier structurally cannot see a whole class
of regression: it never opens a serial port, so every code path behind
`serialport:open` is invisible to it. The xterm upgrade that broke
`Console/Terminal.jsx` is the worked example — the widget threw inside the open
handler, and because `lib/controller/Controller.js` dispatches to listeners
with a plain `forEach`, the exception silenced every widget registered after
it. The workspace connected successfully and came up entirely unjoggable.
