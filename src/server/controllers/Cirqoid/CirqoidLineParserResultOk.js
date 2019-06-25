class CirqoidLineParserResultOk {
    // ok
    static parse(line) {
        const r = line.match(/^ok$/);
        if (!r) {
            return null;
        }

        const payload = {};

        return {
            type: CirqoidLineParserResultOk,
            payload: payload
        };
    }
}

export default CirqoidLineParserResultOk;
