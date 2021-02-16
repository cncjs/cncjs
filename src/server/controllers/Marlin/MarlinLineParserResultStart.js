class MarlinLineParserResultStart {
    // start
    static parse(line) {
        const r = line.match(/^(?:echo:)?start$/);
        if (!r) {
            return null;
        }

        const payload = {};

        return {
            type: MarlinLineParserResultStart,
            payload: payload
        };
    }
}

export default MarlinLineParserResultStart;
