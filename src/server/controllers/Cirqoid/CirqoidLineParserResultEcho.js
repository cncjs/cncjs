class CirqoidLineParserResultEcho {
    // echo:
    static parse(line) {
        const r = line.match(/^echo:\s*(.+)$/i);
        if (!r) {
            return null;
        }

        const payload = {
            message: r[1]
        };

        return {
            type: CirqoidLineParserResultEcho,
            payload: payload
        };
    }
}

export default CirqoidLineParserResultEcho;
