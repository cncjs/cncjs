class MarlinLineParserResultFirmware {
    // FIRMWARE_NAME:Marlin 1.1.0 (Github) SOURCE_CODE_URL:https://github.com/MarlinFirmware/Marlin PROTOCOL_VERSION:1.0 MACHINE_TYPE:RepRap EXTRUDER_COUNT:1 UUID:cede2a2f-41a2-4748-9b12-c55c62f367ff
    static parse(line) {
        let r = line.match(/^FIRMWARE_NAME:.*/i);
        if (!r) {
            return null;
        }

        const payload = {};

        { // FIRMWARE_NAME
            const r = line.match(/FIRMWARE_NAME:([a-zA-Z\_\-]+(\s+[\d\.]+)?)/);
            if (r) {
                payload.firmwareName = r[1];
            }
        }

        { // PROTOCOL_VERSION
            const r = line.match(/PROTOCOL_VERSION:([\d\.]+)/);
            if (r) {
                payload.protocolVersion = r[1];
            }
        }

        { // MACHINE_TYPE
            const r = line.match(/MACHINE_TYPE:(\w+)/);
            if (r) {
                payload.machineType = r[1];
            }
        }

        { // EXTRUDER_COUNT
            const r = line.match(/EXTRUDER_COUNT:(\d+)/);
            if (r) {
                payload.extruderCount = Number(r[1]);
            }
        }

        { // UUID
            const r = line.match(/UUID:([a-zA-Z0-9\-]+)/);
            if (r) {
                payload.uuid = r[1];
            }
        }

        return {
            type: MarlinLineParserResultFirmware,
            payload: payload
        };
    }
}

export default MarlinLineParserResultFirmware;
