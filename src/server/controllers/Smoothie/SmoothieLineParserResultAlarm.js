class SmoothieLineParserResultAlarm {
    static parse(line) {
        const r = line.match(/^ALARM:\s*(.+)$/);
        if (!r) {
            return null;
        }

        const payload = {
            message: r[1]
        };

        return {
            type: SmoothieLineParserResultAlarm,
            payload: payload
        };
    }
}

export default SmoothieLineParserResultAlarm;
