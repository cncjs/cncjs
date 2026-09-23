# The panel

A second application in the same repository, built from the design mockup
rather than migrated out of `src/app`. Served at `/panel` by the same Express
server; the old application keeps `/` and is not touched.

Decided by Mateusz on 2026-09-20, after three screens of migrating in place
showed that changing the contents of panels does not bring the layout closer to
the drawing — every step was a compromise between the mockup and a bootstrap
shell, and every step looked half-finished.

## The drawing is where this started, not where it is decided

Until 2026-09-21 the Claude Design mockup was the source: every layout
question was answered by rendering it and measuring. **It is history now.**
Mateusz settled it once the panel was good enough to look at: the running
panel is the design, and review notes left on it are how it changes.

That is a real change in how to work here. A difference from the drawing is
no longer a defect, and "the drawing does it this way" is no longer an
argument. Both readings on every axis and the coordinate system as a badge
are already departures, decided deliberately.

It is still worth being able to *look* at, because it remains the only
picture of the nine screens nobody has built yet. Read it for those; do not
re-litigate the two that exist.

**Where it lives:** Claude Design project
`7629d30f-1ea4-45a6-9f73-ec9b1ed97bf1`, file `CNC Panel.dc.html`. The
identifier has to be written down, because `list_projects` in DesignSync
shows **only** design-system projects and the mockup is not one — without the
id there is no way to find it. (Superseded: `2d2f27d0-…` / `CNCjs Panel.dc.html`,
the older 1024×600 drawing.) The file itself is not in this repository: 107 kB
of generated React runtime that changes completely on every edit would be
noise in a diff, not history.

**The flow is one-way and cannot be otherwise.** The mockup is a
`PROJECT_TYPE_PROJECT`, which DesignSync can only read; writing needs
`PROJECT_TYPE_DESIGN_SYSTEM`, and the type is fixed at creation. Code never
goes back to the drawing.

**To render it locally:** put the project's `support.js` beside
`CNC Panel.dc.html`, add global UMD React and ReactDOM plus a `createRoot` →
`render` shim, and open it. Navigation works, so any of the eleven screens can
be photographed and placed beside a shot of `/panel` — `scripts/design-diff.js`
does exactly that.

`yarn design-check` changed meaning with all this. It no longer asks "do we
still match the drawing" — it guards against a colour or a size being changed
by accident. When a token moves on purpose, `styles/tokens.expected.css` moves
in the same commit and the commit says why.

## What it is allowed to reuse

**`app/lib/controller`, and nothing else.** It is framework-free — socket.io
and the cncjs event protocol — and rewriting it would mean rewriting the part
of cncjs that actually talks to a machine.

It is reached through `machine/controller.js`, which is the single file
permitted to import from `src/app`. The lint rule forbids the whole tree and
that one file carries the exception: one seam, written down, rather than a rule
with a hole in it nobody remembers the shape of.

## Words

**English is the source language, Polish is a translation of it.** Both live
in `i18n/<lng>/panel.json`, keyed by hand — the old application keys its
resources by the sha1 of the source text and has `i18next-scanner` regenerate
them on every build, which is why nobody can read a diff of its `resource.json`.
Here the keys mean something and no build step rewrites the files.

The panel has **its own** i18next rather than the one in `src/app`, so that
`app/lib/controller` stays the single seam between the two applications.

**The language comes from the browser**, with `?lng=en` or `?lng=pl` overriding
it and nothing cached — which is how the end-to-end tier checks both without
touching the machine's own setting.

**Numbers are formatted by the language.** `{{distance, number(...)}}` puts
`1,7 mm` in Polish and `1.7 mm` in English; the stopping distance used to
`replace('.', ',')` by hand, which was right in one language and a typo in the
other.

Two gates, and they catch different things:

- `panel/no-untranslated-text` (in `eslint-rules/`) fails on a displayed
  string written into the source — between JSX tags, in any attribute that is
  not on its list of never-displayed ones, in a `label`-shaped property of a
  plain `.js` data module, and on any two-word sentence anywhere in the panel.
  It cannot see a key that does not exist.
- `i18n/__tests__/resources.test.js` fails when the two languages disagree on
  their keys or their `{{placeholders}}`, when the panel asks for a key that is
  not defined, and when a resource is defined that nothing asks for.

**What a `.js` module does instead of translating.** `scene/views.js`,
`machine/readings.js` and `ui/jogCorners.js` are the tier Jest runs, with no
browser for i18next to detect a language from. They carry the *key* —
`labelKey`, `status.key` — and the component that draws them looks up the word.

**The machine's own words are not translated.** `Idle`, `Run` and `Alarm` come
over the wire from the firmware and are shown exactly as it says them; only the
four states the panel invents for itself (`Disconnected`, `No server`,
`Connecting`, `Connected`) have keys.

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

**[—] Connecting to a machine — built 2026-09-23.** The mockup draws a panel
that is already connected: no port list, no baud rate, no controller type. It
had to be designed rather than copied, and it is `screens/ConnectScreen.jsx`
plus `machine/ports.js`. The old Connection widget is 962 lines and sits on
`react-select`; this is about 180 and sits on nothing.

- [x] **[—] Choose a serial port** — list ports, refresh, open, close
- [x] **[—] Baud rate**, controller type (Grbl / Marlin / Smoothie / TinyG),
      both taken from what the server says it loaded rather than assumed
- [ ] **[—] DTR/RTS line state, RTS/CTS flow control** — needed by some boards.
      Not built: nothing on this bench needs it and a control nobody can test
      is a control nobody should trust.
- [ ] **[—] Connect automatically** on load. Deliberately not built — the panel
      *attaches* to a port that is already open, which covers the case this was
      for, and opening a port unasked is the one thing a connection screen
      should never do.

**Opening the port puts Grbl in alarm, and the screen says so.** A reset comes
with the port opening, and with `$22=1` the firmware refuses to move until it
has been homed or unlocked. The screen reports it and does not clear it: `$X`
gives an unreferenced machine permission to move, and what is on the other end
of the cable is the operator's business.

**Done already, because nothing worked without it:** attaching to a port that
is *already* open. `Controller.command()` begins `if (!this.port) return` and
fails in silence, so a client that only reads `/api/controllers` has jog keys
that look pressable and do nothing. The panel attaches, and `connected` means
*able to send* rather than "a port is open somewhere".

## Drawn in the mockup

- [x] **[M] Machine state chip** — Idle / Run / Hold / Alarm, with the colours
      approved on 2026-09-20
- [x] **[M] Work position** — X/Y/Z, monospace, tabular, three decimals
- [x] **[M] Machine position** under the work position on every axis, always. The drawing carries `droMode` as three variants an author picks
      between — work, machine, select — and Mateusz settled it on 2026-09-21: one type, no switch. The choice was not worth a control,
      and removing it is what dissolved the "where do widget settings live" question rather than answering it
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
- **Where Settings and alarms live** as screens. Connection is settled: its
  own destination, last on the rail so nothing above it moves, and a sixth
  tab on a phone because a connection is the one thing worth fixing while
  standing at the machine with nothing but a phone.
- **The rail.** The mockup draws eleven destinations and Connection was added
  as a twelfth, at the end. Five are built — Dashboard (temporary), Jog,
  Zeroing, Path, Connection; the rest are shown disabled, so the rail does
  not move under the hand between releases.
- **Where the remaining variants live**, decided 2026-09-21 and not yet
  built: `theme`, `density` and `numFont` belong to a **Ustawienia**
  screen; the active coordinate system belongs to **Zerowanie**, beside
  the offsets and the zeroing buttons, because switching it is a modal
  G-code and not a display option. `navMode` and `target` have no home at
  all — width decides them, so there is nothing to set wrongly. The
  `G54`–`G57` chips will show the active system before they switch it.

  **Half of that is now true.** `Zerowanie` was built on 2026-09-23 and it
  *shows* the active system, in the card's corner — it does not switch it.
  The chips are the missing half, and they are missing deliberately rather
  than forgotten: switching the coordinate system is a modal G-code that
  changes where every later move goes, and it wanted deciding with Mateusz
  in front of it rather than on the way past. `machine/zero.js` already
  refuses to write an offset when the controller has not said which system
  is active, so nothing here guesses in the meantime.
