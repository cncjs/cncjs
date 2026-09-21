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
 * Sent through the feeder like every other line the panel writes. `$#` is one
 * of the few commands Grbl answers while in Alarm, which matters because a
 * machine with homing enabled sits in Alarm from power-on until it is homed —
 * exactly when a panel is being opened to look at it.
 */
export const askForWorkOffsets = () => {
  controller.command('gcode', '$#');
};

export default askForWorkOffsets;
