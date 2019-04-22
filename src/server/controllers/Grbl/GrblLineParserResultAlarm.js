// https://github.com/grbl/grbl/wiki/Interfacing-with-Grbl#alarms
class GrblLineParserResultAlarm {
    static parse(line) {
        const r = line.match(/^ALARM:\s*(.+)$/);
        if (!r) {
            return null;
        }

        const payload = {
            message: r[1]
        };

        return {
            type: GrblLineParserResultAlarm,
            payload: payload
        };
    }
}

export default GrblLineParserResultAlarm;
