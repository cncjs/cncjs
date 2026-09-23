import controller from './controller';

/**
 * Ask the controller where its work coordinate systems are.
 *
 * **Nothing in the server ever sends `$#`.** It polls `$G` for the parser
 * state on a timer and reads `$$` when a port opens, and it parses `[G54:…]`
 * lines when they arrive — `GrblLineParserResultParameters` exists and works —
 * but no code path makes them arrive. So `controller.settings.parameters` is
 * an empty object on every client, forever, unless somebody types `$#` into
 * the console themselves.
 *
 * That is why this is here rather than in the server where it belongs: the
 * toolpath screen draws the work coordinate systems, and a panel cannot draw
 * what it was never told. The entry in `server-backlog.md` is the real fix —
 * `$#` asked alongside `$$` when the port opens, so every client gets it
 * rather than each one asking for itself.
 *
 * Sent through the feeder like every other line the panel writes — **and in
 * alarm the feeder never sends it.** Each of the four controllers begins its
 * `feeder.on('data')` with `if (this.runner.isAlarm()) { this.feeder.reset();
 * return; }`, so the line is dropped by the server before it reaches a cable.
 *
 * This used to say the opposite: that `$#` is one of the few commands Grbl
 * answers in alarm, and that this mattered because a machine with homing
 * enabled sits in alarm from power-on until it is homed. The first half is
 * true of Grbl and irrelevant, because cncjs never lets the line get that
 * far; the second half is exactly when the panel needs the answer and never
 * gets it. Measured 2026-09-23 against an alarmed machine — `$#` on the
 * socket, `Stopped sending G-code commands in Alarm mode` in the log,
 * `parameters` still empty.
 *
 * So on a machine that has not been homed the work offsets are unknown, and
 * the toolpath screen's work-offset layer stays unavailable. The real fix is
 * the one already in `server-backlog.md`: `$#` asked alongside `$$` when the
 * port opens, on the server's own channel rather than through the feeder.
 */
export const askForWorkOffsets = () => {
  controller.command('gcode', '$#');
};

export default askForWorkOffsets;
