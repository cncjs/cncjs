class MarlinLineParserResultTemperature {
    // ok T:0
    // ok T:293.0 /0.0 B:25.9 /0.0 @:0 B@:0
    // ok T:293.0 /0.0 B:25.9 /0.0 T0:293.0 /0.0 T1:100.0 /0.0 @:0 B@:0 @0:0 @1:0
    // ok T:293.0 /0.0 (0.0) B:25.9 /0.0 T0:293.0 /0.0 (0.0) T1:100.0 /0.0 (0.0) @:0 B@:0 @0:0 @1:0
    // ok T:293.0 /0.0 (0.0) B:25.9 /0.0 T0:293.0 /0.0 (0.0) T1:100.0 /0.0 (0.0) @:0 B@:0 @0:0 @1:0 W:?
    // ok T:293.0 /0.0 (0.0) B:25.9 /0.0 T0:293.0 /0.0 (0.0) T1:100.0 /0.0 (0.0) @:0 B@:0 @0:0 @1:0 W:0
    //  T:293.0 /0.0 B:25.9 /0.0 @:0 B@:0
    //  T:293.0 /0.0 B:25.9 /0.0 T0:293.0 /0.0 T1:100.0 /0.0 @:0 B@:0 @0:0 @1:0
    //  T:293.0 /0.0 (0.0) B:25.9 /0.0 T0:293.0 /0.0 (0.0) T1:100.0 /0.0 (0.0) @:0 B@:0 @0:0 @1:0
    static parse(line) {
        let r = line.match(/^(ok)?\s+T:[0-9\.\-]+/i);
        if (!r) {
            return null;
        }

        const payload = {
            ok: line.startsWith('ok'),
            extruder: {},
            heatedBed: {}
        };

        const re = /(?:(?:(T|B|T\d+):([0-9\.\-]+)\s+\/([0-9\.\-]+)(?:\s+\((?:[0-9\.\-]+)\))?)|(?:(@|B@|@\d+):([0-9\.\-]+))|(?:(W):(\?|[0-9]+)))/ig;

        while ((r = re.exec(line))) {
            const key = r[1] || r[4] || r[6];

            if (key === 'T') { // T:293.0 /0.0
                payload.extruder.deg = r[2];
                payload.extruder.degTarget = r[3];
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

            // M109, M190: Print temp & remaining time every 1s while waiting
            if (key === 'W') { // W:?, W:9, ..., W:0
                payload.wait = r[7];
                continue;
            }

            // Hotends: T0, T1, ...
            // TODO
        }

        return {
            type: MarlinLineParserResultTemperature,
            payload: payload
        };
    }
}

export default MarlinLineParserResultTemperature;
