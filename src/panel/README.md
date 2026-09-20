# The panel

A second application in the same repository, built from the design mockup
rather than migrated out of `src/app`. Served at `/panel` by the same Express
server; the old application keeps `/` and is not touched.

Decided by Mateusz on 2026-09-20, after three screens of migrating in place
showed that changing the contents of panels does not bring the layout closer to
the drawing — every step was a compromise between the mockup and a bootstrap
shell, and every step looked half-finished.

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

No CSS-in-JS. `styles/tokens.css` holds every colour, size, weight and spacing
as custom properties; a component's styles live in a `*.module.css` beside it.
A hex code anywhere but the token sheet is a bug.

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

## Drawn in the mockup

- [x] **[M] Machine state chip** — Idle / Run / Hold / Alarm, with the colours
      approved on 2026-09-20
- [x] **[M] Work position** — X/Y/Z, monospace, tabular, three decimals
- [ ] **[M] Machine position** as a quiet note beside the work position
- [ ] **[M] Jog** — XY keypad, Z column, step sizes, jog speed, per-axis homing
- [ ] **[M] Job progress** — percent, bar, file name, line sent/total, time
      remaining
- [ ] **[M] Z height** with **Zero Z** and **Zero XY**
- [ ] **[M] Probe** — plunge distance, feed rate, touch plate thickness,
      retraction, and a probe button; contact state
- [x] **[M] Stop** — feed hold then soft reset
- [ ] **[M] Start job** in the status bar
- [ ] **[M] Status line** — the last thing that happened, with a timestamp

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
- **The rail.** The mockup draws six destinations. The panel has one.
