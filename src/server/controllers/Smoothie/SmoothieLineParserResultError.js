class SmoothieLineParserResultError {
    static parse(line) {
        const r = line.match(/^error:\s*(.+)$/);
        if (!r) {
            return null;
        }

        const payload = {
            message: r[1]
        };

        return {
            type: SmoothieLineParserResultError,
            payload: payload
        };
    }
}

export default SmoothieLineParserResultError;
