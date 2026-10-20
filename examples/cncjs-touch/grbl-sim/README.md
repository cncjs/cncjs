# Grbl simulator for testing without a machine

This folder builds the official Grbl 1.1h firmware as a Linux program (with [grbl-sim](https://github.com/grbl/grbl-sim)) and exposes it as a serial port, so CNCjs and the touch interface can be tested against real Grbl behaviour: planner, acknowledgements, realtime commands, overrides, feed hold, alarms, `$` settings. Nothing moves, and timing is only approximately real time.

## Build and run

On a Linux machine with `gcc`, `make`, `git` and `python3` (tested on the Surface RT, Raspbian 11 armhf, GCC 10):

```sh
bash build.sh                       # clones gnea/grbl v1.1h and grbl-sim, applies the patches, builds
python3 grbl-sim-port.py &          # creates ~/ttyGRBL-sim, restarts the simulator if it exits
bash test-bridge.sh                 # bridge self-test: gives up on a crashing simulator, removes its link
```

The simulator path defaults to the `build.sh` output; set `GRBL_SIM` for another build. A simulator that stops more than five times in a minute makes the bridge give up (see `port.log`).

Add the port to `.cncrc` so CNCjs lists it, then open it in CNCjs like a board (Grbl, any baud rate):

```json
"ports": [{ "path": "/home/pi/ttyGRBL-sim", "manufacturer": "Grbl 1.1h simulator (grbl-sim)" }]
```

A fresh simulator reports every input pin as active (`Pn:PXYZRHS`); `$5=1` and `$6=1` clear the limit and probe pins. Settings persist in `EEPROM.DAT` next to `grbl_sim.exe`. Stop with `pkill -f grbl-sim-port.py; pkill -f grbl_sim.exe`. The simulator uses about a third of one Tegra 3 core while a program runs.

## What the patches change

Grbl itself is unchanged except for one simulator-only edit; grbl-sim needed several fixes to run, and to run in real time, on a small ARM board.

`grbl.patch` (Grbl's `system.c`): the eight `system_set/clear_exec_*` helpers use GCC atomics instead of `SREG` save, `cli()`, restore. On the AVR these sequences are atomic; grbl-sim runs interrupt handlers on a second thread, so they raced: status requests (`?`) were lost about half the time, and a restored `SREG` could leave interrupts disabled for good (the machine froze in `Run`).

`grbl-sim.patch` (grbl-sim):

- `platform_ns()`: the clock was a `double` converted to `uint32_t`, which wraps on x86 but saturates on ARM, so simulated time never advanced. It is computed in 64-bit integers.
- Input: `getchar()` is buffered while `kbhit()` selects on the raw descriptor, so bytes arriving together waited for more input. One byte is read with `read()`, and the per-byte `tcgetattr`/`tcsetattr` toggling (three system calls per byte slot on an already raw port) is gone.
- Event-driven hardware loop: instead of running the timer code for each of the 16 million AVR ticks per second, the loop computes how many ticks remain before something can happen (a compare match or overflow with an interrupt handler, a CTC top, a byte due on the UART) and advances counters in one step, capped at 1 ms. CTC cycles are skipped exactly. `GRBLSIM_NOSKIP=1` restores the tick-by-tick loop.
- An idle serial line is polled every 0.5 ms of simulated time rather than at every byte slot.
- A guard re-enables interrupts left disabled for more than 5 ms of simulated time (Grbl's critical sections last microseconds); with the atomic helpers it should no longer trigger.
- The main loop and the Grbl serial poll sleep briefly instead of spinning.

Measured on the Surface RT: a 10 mm move at 300 mm/min takes 2.53 s (2.5 s expected with 10 mm/s² acceleration); the 18-line test program (square and circle at 400 mm/min) runs in 53.5 s with 210 status reports, the slowest answered in 0.04 s, none lost.

## Limits

- Timing is approximate: the simulator follows the wall clock, with sleeps of up to 1 ms.
- No physics: no inertia, missed steps, real limit switches or probe contact. A passing simulator test is not a machine test.
- Default simulator settings are slow (500 mm/min, 10 mm/s²), which makes feed holds long; that is why a forced stop ends in an alarm (see TESTING.md).
