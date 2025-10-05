import { ensureString } from 'ensure-type';

class MarlinLineParserResultTemperature {
  // https://github.com/MarlinFirmware/Marlin/blob/2.1.x/Marlin/src/module/temperature.cpp
  //
  // Print a single heater state in the form:
  //       Bed: " B:nnn.nn /nnn.nn"
  //   Chamber: " C:nnn.nn /nnn.nn"
  //    Cooler: " L:nnn.nn /nnn.nn"
  //     Probe: " P:nnn.nn"
  //     Board: " M:nnn.nn"
  //       SoC: " S:nnn.nn"
  // Redundant: " R:nnn.nn /nnn.nn"
  //  Extruder: " T0:nnn.nn /nnn.nn"
  //  With ADC: " T0:nnn.nn /nnn.nn (nnn.nn)"
  //
  // Example #1
  // ```
  // ok T:0
  // ok T:293.0 /0.0 B:25.9 /0.0 @:0 B@:0
  // ok T:293.0 /0.0 B:25.9 /0.0 T0:293.0 /0.0 T1:100.0 /0.0 @:0 B@:0 @0:0 @1:0
  // ok T:293.0 /0.0 (0.0) B:25.9 /0.0 T0:293.0 /0.0 (0.0) T1:100.0 /0.0 (0.0) @:0 B@:0 @0:0 @1:0
  // ok T:293.0 /0.0 (0.0) B:25.9 /0.0 T0:293.0 /0.0 (0.0) T1:100.0 /0.0 (0.0) @:0 B@:0 @0:0 @1:0 W:?
  // ok T:293.0 /0.0 (0.0) B:25.9 /0.0 T0:293.0 /0.0 (0.0) T1:100.0 /0.0 (0.0) @:0 B@:0 @0:0 @1:0 W:0
  // ok T0:27.58 /0.00 B:28.27 /0.00 T0:27.58 /0.00 T1:27.37 /0.00 @:0 B@:0 @0:0 @1:0
  //  T:293.0 /0.0 B:25.9 /0.0 @:0 B@:0
  //  T:293.0 /0.0 B:25.9 /0.0 T0:293.0 /0.0 T1:100.0 /0.0 @:0 B@:0 @0:0 @1:0
  //  T:293.0 /0.0 (0.0) B:25.9 /0.0 T0:293.0 /0.0 (0.0) T1:100.0 /0.0 (0.0) @:0 B@:0 @0:0 @1:0
  //  T0:27.37 /0.00 B:28.27 /0.00 T0:27.58 /0.00 T1:27.37 /0.00 @:0 B@:0 @0:0 @1:0
  // ```
  //
  // Example #2: T0 is the active hotend
  // ```
  //  T:293.0 /0.0 B:25.9 /0.0 T0:293.0 /0.0 T1:100.0 /0.0 @:0 B@:0 @0:0 @1:0
  //  T0:293.0 /0.0 B:25.9 /0.0 T0:293.0 /0.0 T1:100.0 /0.0 @:0 B@:0 @0:0 @1:0
  // ```
  //
  // Example #3: T1 is the active hotend
  // ```
  //  T:100.0 /0.0 B:25.9 /0.0 T0:293.0 /0.0 T1:100.0 /0.0 @:0 B@:0 @0:0 @1:0
  //  T0:100.0 /0.0 B:25.9 /0.0 T0:293.0 /0.0 T1:100.0 /0.0 @:0 B@:0 @0:0 @1:0
  // ```
  static parse(line) {
    let r = line.match(/^(ok)?\s+(T\d+|T|B|C|L|P|M|S|R):[0-9\.\-]+/i);
    if (!r) {
      return null;
    }

    const payload = {
      ok: line.startsWith('ok'),

      // T0:nnn.nn /nnn.nn
      // T1:nnn.nn /nnn.nn
      hotend: {},

      // T:nnn.nn /nnn.nn
      extruder: {},

      // B:nnn.nn /nnn.nn
      heatedBed: {},

      // C:nnn.nn /nnn.nn
      heatedChamber: {},

      // L:nnn.nn /nnn.nn
      cooler: {},

      // P:nnn.nn
      probe: {},

      // M:nnn.nn
      board: {},

      // S:nnn.nn
      soc: {},

      // R:nnn.nn /nnn.nn
      redundant: {},
    };

    const re = /(?:(?:(T\d+|T|B|C|L|P|M|S|R):([0-9\.\-]+)\s+\/([0-9\.\-]+)(?:\s+\((?:[0-9\.\-]+)\))?)|(?:(@|B@|C@|@\d+):([0-9\.\-]+))|(?:(W):(\?|[0-9]+)))/ig;

    while ((r = re.exec(line))) {
      // r[1] = T0, T1, T, B, C, L, P, M, S, R
      // r[4] = @, B@, C@, @0, @1
      // r[6] = W
      const key = r[1] || r[4] || r[6];

      { // Multi-Hotend (T0:293.0 /0.0)
        const found = ensureString(key).match(/^T(\d+)$/);
        if (found) {
          const hotendIndex = parseInt(found[1], 10);
          const hotendKey = `T${hotendIndex}`;
          payload.hotend[hotendKey] = {
            ...payload.hotend[hotendKey],
            deg: r[2],
            degTarget: r[3],
          };
          // Try to update the active hot end if the hot end index is 0.
          // Note: The active hot end might be reported as T0 before B.
          if (hotendIndex === 0) { // T0:27.37 /0.00
            payload.extruder.deg = payload.extruder.deg ?? r[2];
            payload.extruder.degTarget = payload.extruder.degTarget ?? r[3];
          }
          continue;
        }
      }

      if (key === 'T') { // Hotend (T:293.0 /0.0)
        payload.extruder.deg = payload.extruder.deg ?? r[2];
        payload.extruder.degTarget = payload.extruder.degTarget ?? r[3];
        continue;
      }

      if (key === 'B') { // Heated bed (B:60.0 /0.0)
        payload.heatedBed.deg = r[2];
        payload.heatedBed.degTarget = r[3];
        continue;
      }

      if (key === 'C') { // Heated chamber
        payload.heatedChamber.deg = r[2];
        payload.heatedChamber.degTarget = r[3];
        continue;
      }

      if (key === 'L') { // Cooler
        payload.cooler.deg = r[2];
        payload.cooler.degTarget = r[3];
        continue;
      }

      if (key === 'P') { // Probe
        payload.probe.deg = r[2];
        continue;
      }

      if (key === 'M') { // Board
        payload.board.deg = r[2];
        continue;
      }

      if (key === 'S') { // SoC
        payload.soc.deg = r[2];
        continue;
      }

      if (key === 'R') { // Redundant
        payload.redundant.deg = r[2];
        payload.redundant.degTarget = r[3];
        continue;
      }

      if (key === '@') { // @:127
        payload.extruder.power = r[5];
        continue;
      }

      if (key === 'B@') { // B@:127
        payload.heatedBed.power = r[5];
        continue;
      }

      if (key === 'C@') { // C@:127
        // The first @C:nnn represents the soft PWM amount of the heated chamber
        if (payload.heatedChamber.deg !== undefined && payload.heatedChamber.power === undefined) {
          // Set power for heated chamber if not set
          payload.heatedChamber.power = r[5];
          continue;
        }

        // The second @C:nnn represents the soft PWM amount of the cooler
        if (payload.cooler.deg !== undefined && payload.cooler.power === undefined) {
          // Set power for cooler if not set
          payload.cooler.power = r[5];
          continue;
        }
      }

      { // Hotend power (@0:0)
        const found = ensureString(key).match(/^@(\d+)$/);
        if (found) {
          const hotendIndex = parseInt(found[1], 10);
          const hotendKey = `T${hotendIndex}`;
          payload.hotend[hotendKey] = {
            ...payload.hotend[hotendKey],
            power: r[5],
          };
          continue;
        }
      }

      // M109, M190: Print temp & remaining time every 1s while waiting
      if (key === 'W') { // W:?, W:9, ..., W:0
        payload.wait = r[7];
        continue;
      }
    }

    return {
      type: MarlinLineParserResultTemperature,
      payload: payload
    };
  }
}

export default MarlinLineParserResultTemperature;
