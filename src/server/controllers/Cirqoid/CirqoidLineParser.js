import _ from 'lodash';
import CirqoidLineParserResultEcho from './CirqoidLineParserResultEcho';
import CirqoidLineParserResultError from './CirqoidLineParserResultError';
import CirqoidLineParserResultFirmware from './CirqoidLineParserResultFirmware';
import CirqoidLineParserResultOk from './CirqoidLineParserResultOk';
import CirqoidLineParserResultPosition from './CirqoidLineParserResultPosition';
import CirqoidLineParserResultStart from './CirqoidLineParserResultStart';
import CirqoidLineParserResultTemperature from './CirqoidLineParserResultTemperature';

class CirqoidLineParser {
    parse(line) {
        const parsers = [
            // start
            CirqoidLineParserResultStart,

            // FIRMWARE_NAME:Cirqoid
            CirqoidLineParserResultFirmware,

            // X:0.00 Y:0.00 Z:0.00 E:0.00 Count X:0 Y:0 Z:0
            CirqoidLineParserResultPosition,

            // ok
            CirqoidLineParserResultOk,

            // echo:
            CirqoidLineParserResultEcho,

            // Error:Printer halted. kill() called!
            CirqoidLineParserResultError,

            // ok T:293.0 /0.0 B:25.9 /0.0 @:0 B@:0
            //  T:293.0 /0.0 B:25.9 /0.0 @:0 B@:0
            CirqoidLineParserResultTemperature
        ];

        for (let parser of parsers) {
            const result = parser.parse(line);
            if (result) {
                _.set(result, 'payload.raw', line);
                return result;
            }
        }

        return {
            type: null,
            payload: {
                raw: line
            }
        };
    }
}

export default CirqoidLineParser;
