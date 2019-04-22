class GrblLineParserResultOk {
    static parse(line) {
        const r = line.match(/^ok$/);
        if (!r) {
            return null;
        }

        const payload = {};

        return {
            type: GrblLineParserResultOk,
            payload: payload
        };
    }
}

export default GrblLineParserResultOk;
