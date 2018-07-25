class GrblLineParserResultOption {
    static parse(line) {
        // * Grbl v1.1
        //   [OPT:]
        const r = line.match(/^\[(?:OPT:)(.+)\]$/);
        if (!r) {
            return null;
        }

        const payload = {
            message: r[1]
        };

        return {
            type: GrblLineParserResultOption,
            payload: payload
        };
    }
}

export default GrblLineParserResultOption;
