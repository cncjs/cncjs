class CirqoidLineParserResultStart {
    // start
    static parse(line) {
        const r = line.match(/^start$/);
        if (!r) {
            return null;
        }

        const payload = {};

        return {
            type: CirqoidLineParserResultStart,
            payload: payload
        };
    }
}

export default CirqoidLineParserResultStart;
