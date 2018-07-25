class GrblLineParserResultEcho {
    static parse(line) {
        // * Grbl v1.1
        //   [echo:]
        const r = line.match(/^\[(?:echo:)(.+)\]$/);
        if (!r) {
            return null;
        }

        const payload = {
            message: r[1]
        };

        return {
            type: GrblLineParserResultEcho,
            payload: payload
        };
    }
}

export default GrblLineParserResultEcho;
