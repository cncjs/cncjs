# The panel

A second application in the same repository, built from the design mockup
rather than migrated out of `src/app`. Served at `/panel` by the same Express
server; the old application keeps `/` and is not touched.

Decided by Mateusz on 2026-09-20, after three screens of migrating in place
showed that changing the contents of panels does not bring the layout closer to
the drawing — every step was a compromise between the mockup and a bootstrap
shell, and every step looked half-finished.

## Where the drawing lives

**Claude Design project `7629d30f-1ea4-45a6-9f73-ec9b1ed97bf1`, file
`CNC Panel.dc.html`**, with `HANDOFF-TODO.md` beside it. Read them with the
`DesignSync` tool — `list_files` then `get_file`; no login step and no config
in this repository.

The id has to be written down because **`list_projects` only enumerates
design-system projects**, and a mockup project is not one. Without the id there
is no way to find it.

Superseded: `2d2f27d0-55d9-4460-9997-b4ee99335575` / `CNCjs Panel.dc.html`. It
is an older, smaller drawing — two frames, 1024x600, square corners. Everything
built from it before 2026-09-21 is built from the wrong picture.

The mockup renders locally: save the file and `support.js` beside it, put React
and ReactDOM UMD globals in front of the runtime with a `createRoot` shim, and
open it. Its navigation works, so every screen can be photographed rather than
described.

## What it is allowed to reuse

**`app/lib/controller`, and nothing else.** It is framework-free — socket.io
and the cncjs event protocol — and rewriting it would mean rewriting the part
of cncjs that actually talks to a machine.

It is reached through `machine/controller.js`, which is the single file
permitted to import from `src/app`. The lint rule forbids the whole tree and
that one file carries the exception: one seam, written down, rather than a rule
with a hole in it nobody remembers the shape of.

## How it is built

`webpack.config.panel.js` is its own compiler, which is what lets the panel run
**React 19** while `src/app` stays on React 17. The two never meet: separate
entries, separate bundles, separate pages. React 19 is installed under an alias
(`react19@npm:react@19.2.0`) and only this compiler resolves it.

```
yarn start-panel-dev     # webpack --watch into output/cncjs/panel
yarn win-dev             # runs it alongside the app and the server
```

No CSS-in-JS and no hand-written stylesheets. **Tailwind**, per the mockup's
own handoff, configured in `tailwind.panel.config.js` — and every value there
points at a custom property in `styles/tokens.css`, which is a copy of the
drawing's `:root`. That indirection is the whole trick: the mockup switches
theme, density, target and number face by attribute on the root, and a utility
class compiled to `var(--acc)` follows the switch without a rebuild.

Tailwind's default palette is *replaced*, not extended, so `bg-slate-200` does
not compile. A `#hex` or a `text-[13px]` in a component is a bug: if a value is
needed and is not in the token sheet, it belongs in the token sheet first.

## One widget, any container

**A widget is one component that lays itself out from the room it is given.**
The same `JogWidget` is a tile on a dashboard and the body of the jog screen —
372px wide in one and 863px in the other, inside an identical 1024px viewport.
A media query cannot tell those apart, so arrangement is decided with
**container queries** (`@container` on the widget root, `@4xl:` on what
rearranges) and never with the viewport.

A screen places widgets and decides nothing else. `screens/Dashboard.jsx` and
`screens/JogScreen.jsx` are both thin enough to read in one go, and that is the
test: if a screen starts describing what is inside a widget, the widget is not
finished.

Height is handled without a breakpoint. In the jog widget the pad keeps its
size — it is a target an operator hits without looking, so it must never move —
and the step and speed controls hold the height the drawing gives them while
the space around them takes up the slack. When even that does not fit, the card
scrolls rather than clipping; it was measured doing so, not assumed.

Shared primitives live in `ui/`: `Button` (five tones, because the mockup's
fills mean things), `Card`, `SegmentedChoice`, `Stepper`, `JogPad`, `Dro`. A
class string copied into a second widget is the signal to make a sixth.

---

# What the old application does

The list Mateusz asked for: everything `src/app` can do, to be verified and
implemented rather than assumed. **Nothing here is done until it has been used
against the machine.**

Legend: **[M]** drawn in the mockup · **[L]** in the mockup's tile library, and
therefore illustrative · **[—]** not in the mockup at all.

## The gap the mockup does not cover

**[—] Connecting to a machine.** The mockup draws a panel that is already
connected: there is no port list, no baud rate, no controller type. The panel is
unusable without one, so this is the first thing that has to be designed rather
than copied. The old Connection widget is 962 lines and sits on `react-select`.

- [ ] **[—] Choose a serial port** — list ports, refresh, open, close
- [ ] **[—] Baud rate**, controller type (Grbl / Marlin / Smoothie / TinyG)
- [ ] **[—] DTR/RTS line state, RTS/CTS flow control** — needed by some boards
- [ ] **[—] Connect automatically** on load

**Done already, because nothing worked without it:** attaching to a port that
is *already* open. `Controller.command()` begins `if (!this.port) return` and
fails in silence, so a client that only reads `/api/controllers` has jog keys
that look pressable and do nothing. The panel attaches, and `connected` means
*able to send* rather than "a port is open somewhere".

## Drawn in the mockup

- [x] **[M] Machine state chip** — Idle / Run / Hold / Alarm, with the colours
      approved on 2026-09-20
- [x] **[M] Work position** — X/Y/Z, monospace, tabular, three decimals
- [ ] **[M] Machine position** as a quiet note beside the work position
- [x] **[M] Jog** — XY keypad, Z column, step sizes, jog speed. Grbl gets
      `$J=`, which carries the chosen feed rate, leaves the modal state alone
      and can be cancelled; the old application's `G91`/`G0`/`G90` does none
      of those
- [ ] **[M] Homing from the jog tile** — the mockup draws a home glyph in the
      keypad's centre and beside Z. Left out deliberately: `$22=0` on this
      controller, so homing is disabled and there is nothing to verify a
      button against. A `$H` sent to a machine without limit switches is not
      something to ship untested
- [x] **[M] Job progress** — percent, bar, file name, line sent/total, time
      remaining. Start and Pause are drawn and dead: the sender commands
      behind them are not wired or tested against a controller
- [x] **[M] Z height** with **Zero Z** and **Zero XY**. Probe Z is drawn and
      dead, for the reason below
- [ ] **[M] Probe** — plunge distance, feed rate, touch plate thickness,
      retraction, and a probe button; contact state
- [x] **[M] Stop** — feed hold then soft reset
- [ ] **[M] Start job** in the status bar
- [x] **[M] Status line** — what is connected, and failures in red. Errors go
      here rather than into a banner above the screen: a banner is a band of
      height that appears when something goes wrong, which is the moment an
      operator can least afford every control to move

## In the tile library, so illustrative

- [ ] **[L] Toolpath preview** — the visualizer. three.js, a canvas, and by far
      the largest single item on this list
- [ ] **[L] Feed and spindle overrides** — F/S/R percentages with steps
- [ ] **[L] Macros** — list, run, add, edit, delete
- [ ] **[L] Console** — terminal, command history, a line editor
- [ ] **[L] Camera** — MJPEG or stream, scale, rotation, flip, crosshair
- [ ] **[L] Probe status** — contact / no contact
- [ ] **[L] Temperature and spindle speed**

## Not in the mockup, and the old application has it

Each of these needs a decision before it needs code: does the panel carry it,
does it stay behind in the old application, or does it go?

- [ ] **[—] G-code loading** — upload, drag and drop onto the workspace, watch
      directory, close file
- [ ] **[—] Workflow control** — run, pause, resume, stop, and what each does
      to the sender
- [ ] **[—] MDI** — type a line and send it
- [ ] **[—] Work coordinate systems** — G54 to G59, and switching between them
- [ ] **[—] Modal groups and controller state** — the readings the Grbl panel
      shows, plus the raw controller dialog
- [ ] **[—] Queue reports** — planner and receive buffer, when `$10` reports
      them
- [ ] **[—] Controller commands** — status report, check mode, homing, unlock,
      sleep, and the six query commands
- [ ] **[—] Spindle and coolant** — on, off, speed, mist, flood
- [ ] **[—] Laser** — test fire, power, duration
- [ ] **[—] Tool change** — the tool-change sequence and its custom probe
      script
- [ ] **[—] Autolevel** — surface probing over a grid
- [ ] **[—] Settings** — general, workspace, controller, machine profiles, user
      accounts, commands, events, about. 4 883 lines in the old application
- [ ] **[—] Custom widget** — an iframe of a URL the operator typed
- [ ] **[—] Keyboard shortcuts** — the whole combokeys layer
- [ ] **[—] Notifications** — push, and the events that raise them
- [ ] **[—] Sign in / sign out** — the panel currently signs in anonymously,
      which only works on a server with no accounts
- [ ] **[—] Internationalisation** — sixteen languages in the old application
- [ ] **[—] Electron client mode** — the laptop connecting to the garage server

## Decisions still open

- **The tile grid.** The mockup draws 1×1 / 2×1 sizes, named layout sets and a
  dashboard edit mode. Tiles stay illustrative until asked for; views here
  assume nothing about their container.
- **Where Connection, Settings and alarms live** as screens.
- **The rail.** The mockup draws eleven destinations. Two are built; the rest
  are shown disabled, so the rail does not move under the hand between
  releases.
