class SmoothieLineParserResultOk {
    static parse(line) {
        const r = line.match(/^ok$/);
        if (!r) {
            return null;
        }

        const payload = {};

        return {
            type: SmoothieLineParserResultOk,
            payload: payload
        };
    }
}

export default SmoothieLineParserResultOk;
