import { ensureString } from 'ensure-type';

class MarlinLineParserResultTemperature {
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
  //
  // Example: When the active hot end is set to T0
  //  T:293.0 /0.0 B:25.9 /0.0 T0:293.0 /0.0 T1:100.0 /0.0 @:0 B@:0 @0:0 @1:0
  //  T0:293.0 /0.0 B:25.9 /0.0 T0:293.0 /0.0 T1:100.0 /0.0 @:0 B@:0 @0:0 @1:0
  //
  // Example: When the active hot end is set to T1
  //  T:100.0 /0.0 B:25.9 /0.0 T0:293.0 /0.0 T1:100.0 /0.0 @:0 B@:0 @0:0 @1:0
  //  T0:100.0 /0.0 B:25.9 /0.0 T0:293.0 /0.0 T1:100.0 /0.0 @:0 B@:0 @0:0 @1:0
  static parse(line) {
    let r = line.match(/^(ok)?\s+(T|T\d+):[0-9\.\-]+/i);
    if (!r) {
      return null;
    }

    const payload = {
      ok: line.startsWith('ok'),
      extruder: {}, // active hotend
      heatedBed: {},
      hotend: {},
    };

    const re = /(?:(?:(T|B|T\d+):([0-9\.\-]+)\s+\/([0-9\.\-]+)(?:\s+\((?:[0-9\.\-]+)\))?)|(?:(@|B@|@\d+):([0-9\.\-]+))|(?:(W):(\?|[0-9]+)))/ig;

    while ((r = re.exec(line))) {
      // r[1] = T, B, T0, T1
      // r[4] = @, B@, @0, @1
      // r[6] = W
      const key = r[1] || r[4] || r[6];

      { // Hotend temperature (T0:293.0 /0.0)
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

      if (key === 'T') { // T:293.0 /0.0
        payload.extruder.deg = payload.extruder.deg ?? r[2];
        payload.extruder.degTarget = payload.extruder.degTarget ?? r[3];
        continue;
      }

      if (key === 'B') { // B:60.0 /0.0
        payload.heatedBed.deg = r[2];
        payload.heatedBed.degTarget = r[3];
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
