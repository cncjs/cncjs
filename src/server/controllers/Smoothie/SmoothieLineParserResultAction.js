class SmoothieLineParserResultAction {
    static parse(line) {
        // handle action commands from the host
        // see https://reprap.org/wiki/G-code#Replies_from_the_RepRap_machine_to_the_host_computer
        // '// action:{pause,resume,cancel}\r\n'
        const r = line.match(/^\/\/ action:(.+)$/);
        if (!r) {
            return null;
        }

        const payload = {
            message: r[1]
        };

        return {
            type: SmoothieLineParserResultAction,
            payload: payload
        };
    }
}

export default SmoothieLineParserResultAction;
