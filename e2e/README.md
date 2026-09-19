# End-to-end smoke tests

These specs exist to catch regressions that the Jest suite structurally cannot
see: `jest.testMatch` only covers `src/server/**` and `grbl-simulator/**`, so
every one of the ~41k lines under `src/app` is otherwise unverified.

They are deliberately shallow. The goal is to notice when a dependency upgrade
stops a widget from mounting, blanks a settings pane, or starts throwing in the
console — not to assert on business logic.

## Running

The smoke and hardware tiers test a server that is already running; they do not
start one. The auth tier starts its own, and the Electron tier launches the
packaged app.

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
- **visualizer.spec.js** — what the Three.js scene actually draws, compared
  against committed screenshots: the default view, each of the five preset
  viewpoints, and that a preset restores the same framing after the view has
  been dragged away from it. See "Screenshot baselines" below.
- **interaction.spec.js** — whether the app still answers a click, as opposed
  to merely painting. A dialog opens, takes input and closes; a dropdown menu
  opens, stays open, closes from its own toggle, from a press outside it and
  from Escape; and a choice made in one arrives in the editor underneath. The
  dropdowns are here because every one of them was dead for a while and no
  tier could tell: React 17 delivers a click to the root container before
  document, so the root-close listener react-dropdown attaches when a menu
  opens was still standing in the path of the click that opened it. Nothing
  in this suite had ever clicked a menu. It also checks that a clicked
  button does not leave its tooltip behind, because nearly every toolbar
  button here is wrapped in one and they accumulate when they stop hiding.
- **configured-widgets.spec.js** — the two widgets that render nothing in a
  default install and had therefore never been covered at all. It seeds the
  custom widget with a URL and asserts the frame it builds still carries the
  sandbox, width and height that @trendmicro/react-iframe used to supply,
  and it switches the webcam on and watches the image element's src being
  cleared and restored by Refresh. Both reach the DOM through a ref that
  used to be a findDOMNode call, which is why they are worth the seeding.

## What is not covered

Anything requiring a machine: jogging, G-code streaming, probing, homing. Those
need a controller on a serial port and, more importantly, they move real
hardware — they belong in a separate, explicitly opt-in tier.

## Screenshot baselines

`workspace.spec.js` asserts that a canvas appears and has a non-zero box. That
is worth having, but a renderer drawing nothing at all satisfies it just as
well — the element is there either way. `visualizer.spec.js` closes that gap
with `toHaveScreenshot()` against baselines committed under
`*.spec.js-snapshots/`.

Three things reach the canvas and none of them is pinned by default, so
`visualizer-fixtures.js` seeds all three before the first navigation: the
machine profile (the grid bounds, axis extents and limits cuboid are all
derived from it), the widget's own persisted projection/camera/visibility
state, and the device pixel ratio. `app/store` reads localStorage once at
module evaluation, which is why the seed goes in through `addInitScript`
rather than after the page has loaded.

Two caveats are deliberate rather than sloppy:

- **The allowance is measured, not guessed.** The first version of this used a
  2% `maxDiffPixelRatio`, which sounded conservative and was in fact loose
  enough that recolouring every rapid motion from green to red still passed —
  thin, half-transparent lines cover very little of a mostly-white canvas, so a
  ratio of the whole image is the wrong unit. The numbers on this machine, in
  pixels of a ~500x565 canvas: re-running the same build differs by **0**,
  recolouring every rapid by **~1250**, and the whole `three` 0.103 → 0.186
  port by **799** on the toolpath image and **140** on the grid-only one. So
  the allowance is an absolute `maxDiffPixels: 50` — an order of magnitude
  below the smallest change worth calling a regression, with room for the
  antialiasing jitter a driver or Chromium update may bring. If an update ever
  moves more than that, re-record rather than raising the allowance. Those
  figures were taken while the toolpath was still drawn as one-pixel lines;
  the fat lines that replaced them cover far more of the canvas, so the same
  allowance is if anything stricter now.
- **The baselines belong to this machine.** That is acceptable because there is
  only one, but it does mean a baseline is re-recorded on purpose (delete the
  PNG and re-run) rather than whenever it goes red.

The preset views are the case where a photograph beats an assertion. The unit
tests in `camera-fit` prove a bounding box ends up on screen, but not that
"front" faces the front; five images of an envelope that is 80 wide, 60 deep
and 20 tall do, because it looks different from every side and a view wired to
the wrong direction cannot match any baseline but its own.

A screenshot spec that only ever photographs one scene proves very little, so
each tier also owns a control: the smoke tier photographs the same scene with
the grid, numbers and limits switched off, and the hardware tier photographs
the scene after the loaded file is closed again. If those came out looking like
the positive cases, none of the assertions would be measuring anything.

An element screenshot clips the composited page, not the WebGL buffer, so DOM
chrome overlapping the canvas lands in the image too. The workflow toolbar and
the loaded file's name are masked out — the toolbar because its buttons change
with the connection state, the name because its antialiasing is a font concern.

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

`hardware/visualizer.spec.js` is here for a structural reason rather than a
convenient one. G-code reaches the visualizer only as a `gcode:load` event on a
connected controller, and `controller.command('gcode:load', ...)` is addressed
to a port — with nothing open the upload is dropped and the scene stays empty.
So the smoke tier cannot draw a toolpath at all, and the toolpath baseline has
to live where a controller exists. **It does not move the machine**: loading
G-code fills the sender's queue, only Run starts streaming it, and Run is never
clicked. It does assert the work position is at origin first, because the
cutting tool is drawn there — that turns "the baseline is only comparable from a
known position" into a message instead of a mystery pixel diff.

This tier exists because the smoke tier structurally cannot see a whole class
of regression: it never opens a serial port, so every code path behind
`serialport:open` is invisible to it. The xterm upgrade that broke
`Console/Terminal.jsx` is the worked example — the widget threw inside the open
handler, and because `lib/controller/Controller.js` dispatches to listeners
with a plain `forEach`, the exception silenced every widget registered after
it. The workspace connected successfully and came up entirely unjoggable.

## Electron tier

`e2e/electron/` drives the packaged desktop app through Playwright's Electron
support, so it launches a real Electron process rather than a browser. It is
skipped until a build exists.

```bash
yarn build-prod
yarn test:e2e --project=electron
```

The client-mode specs also need a cncjs server to point at — `CNCJS_URL`,
defaulting to `http://localhost:8000`, the same as the smoke tier.

What it locks in:

- the app starts its own server on a random loopback port and mounts the
  workspace;
- the renderer has no route into Node — `require`, `process`, `ipcRenderer` and
  `module` are all undefined. This is the assertion that matters most: the
  window loads its content over HTTP, from another machine once a server is
  configured, so anything reachable there is reachable by whoever serves that
  page;
- the preload bridge exposes exactly `readUserConfig` and `writeUserConfig`.
  Widening that list is a security decision, not a refactor, and this test is
  meant to make you argue for it;
- the user config round-trips over IPC, and the spec restores whatever it
  found;
- client mode loads the configured server, reaches its API, survives a restart,
  and releases back to the local server on an empty `--server-url`;
- the server picker rejects a malformed address instead of storing it. Storing
  it would relaunch the app pointed at a server that cannot exist, and the only
  way back would be the command line.

Specs that change the configured server write into `electron-store`, which
outlives the process. `afterEach` puts it back — if you add a spec that touches
it, keep that guarantee or the next run starts somewhere unexpected.

## Auth tier

`e2e/auth/` covers the API gate the way a deployment meets it. It starts its
own server rather than using the dev one, because `NODE_ENV=development`
bypasses JWT verification outright in `src/server/app.js` — every assertion
here would pass vacuously against `yarn win-dev`.

```bash
yarn build-prod
yarn test:e2e --project=auth
```

It needs no running server and no hardware. Each block spawns
`bin/cncjs` in production mode on a free port with its own temporary `.cncrc`,
so the accounts under test never touch your own config, and kills it afterwards.

What it locks in:

- with accounts configured, a request carrying no token is refused, a wrong
  password is refused, and the right password yields a token that works;
- **a token stops working when its account is deleted.** The token still
  verifies — it carries the server's signature and has not expired — so
  `expressjwt` passing is not the same question as "does this account still
  exist". Until this was fixed the two were conflated and deleting a user left
  their access intact for the lifetime of their token, 30 days by default;
- deleting one account does not disturb another;
- before any account exists, `/api/signin` hands a token to anyone and the
  server honours it. That is cncjs's first-run behaviour and the tier pins it
  so that tightening the gate cannot quietly break setting the machine up.

The specs assert on `/api/controllers`, which needs no machine attached and
answers `[]`.

## Running the dev server for long sessions

Two things worth knowing if you leave `yarn win-dev` up for hours while
iterating on these specs.

The webpack watcher grows. On a long session it has been observed past 10 GB
of resident memory — `eval-cheap-module-source-map` over a project this size
keeps a lot alive. Restart it occasionally rather than wondering where the RAM
went.

`win-dev` is a tree — `yarn` → `concurrently` → `npm` → `cross-env` → the
server and the webpack watcher. Killing whatever is listening on :8000 and
:8080 kills the leaves and orphans everything above them, and the orphaned
watcher keeps running and keeps growing. Kill the tree:

```powershell
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -match 'cncjs|win-dev|start-app-dev|start-server-dev' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
```

Playwright itself cleans up after runs — leaked browsers have not been a
problem here. Check before blaming it: Playwright's Chromium lives under
`ms-playwright`, so anything running from `Program Files` is your own browser
and killing it will cost you your tabs.
