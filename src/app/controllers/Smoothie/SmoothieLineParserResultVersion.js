import _ from 'lodash';

class SmoothieLineParserResultVersion {
    // Build version: edge-3332442, Build date: xxx, MCU: LPC1769, System Clock: 120MHz
    static parse(line) {
        // LPC1768 or LPC1769 should be Smoothie
        if (line.indexOf('LPC176') < 0) {
            return null;
        }

        const payload = {};
        const r = line.match(/[a-zA-Z0-9\s]+:[^,]+/g);
        if (!r) {
            return null;
        }

        r.forEach((str) => {
            const nv = str.match(/\s*([^:]+)\s*:\s*(.*)\s*$/);
            if (!nv) {
                return;
            }

            const [name, value] = nv.slice(1);

            // Build version: edge-3332442
            if (name.match(/Build version/i)) {
                _.set(payload, 'build.version', value);
            }

            // Build date: Apr 22 2015 15:52:55
            if (name.match(/Build date/i)) {
                _.set(payload, 'build.date', value);
            }

            // MCU: LPC1769
            if (name.match(/MCU/i)) {
                _.set(payload, 'mcu', value);
            }

            // System Clock: 120MHz
            if (name.match(/System Clock/i)) {
                _.set(payload, 'sysclk', value);
            }
        });

        // MCU is a required field
        if (!payload.mcu) {
            return null;
        }

        return {
            type: SmoothieLineParserResultVersion,
            payload: payload
        };
    }
}

export default SmoothieLineParserResultVersion;
