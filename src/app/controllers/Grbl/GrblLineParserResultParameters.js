class GrblLineParserResultParameters {
    static parse(line) {
        const r = line.match(/^\[(G54|G55|G56|G57|G58|G59|G28|G30|G92|TLO|PRB):(.+)\]$/);
        if (!r) {
            return null;
        }

        const name = r[1];
        const value = r[2];
        const payload = {
            name: name,
            value: ''
        };

        // [Gxx:0.000]
        const re = /^G\d+$/i;
        if (re.test(name)) {
            const axes = ['x', 'y', 'z', 'a', 'b', 'c'];
            const list = value.split(',');
            payload.value = {};
            for (let i = 0; i < list.length; ++i) {
                payload.value[axes[i]] = list[i];
            }
        }

        // [TLO:0.000]
        if (name === 'TLO') {
            payload.value = value;
        }

        // [PRB:0.000,0.000,1.492:1]
        if (name === 'PRB') {
            const axes = ['x', 'y', 'z', 'a', 'b', 'c'];
            const [str, result] = value.split(':');
            const list = str.split(',');
            payload.value = {};
            payload.value.result = Number(result);
            for (let i = 0; i < list.length; ++i) {
                payload.value[axes[i]] = list[i];
            }
        }

        return {
            type: GrblLineParserResultParameters,
            payload: payload
        };
    }
}

export default GrblLineParserResultParameters;
