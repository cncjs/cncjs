import _ from 'lodash';
import SmoothieLineParserResultStatus from './SmoothieLineParserResultStatus';
import SmoothieLineParserResultOk from './SmoothieLineParserResultOk';
import SmoothieLineParserResultError from './SmoothieLineParserResultError';
import SmoothieLineParserResultAlarm from './SmoothieLineParserResultAlarm';
import SmoothieLineParserResultAction from './SmoothieLineParserResultAction';
import SmoothieLineParserResultParserState from './SmoothieLineParserResultParserState';
import SmoothieLineParserResultParameters from './SmoothieLineParserResultParameters';
import SmoothieLineParserResultVersion from './SmoothieLineParserResultVersion';

class SmoothieLineParser {
    parse(line) {
        const parsers = [
            // <>
            SmoothieLineParserResultStatus,

            // ok
            SmoothieLineParserResultOk,

            // error:x
            SmoothieLineParserResultError,

            // ALARM:
            SmoothieLineParserResultAlarm,

            // action:x
            SmoothieLineParserResultAction,

            // [G38.2 G54 G17 G21 G91 G94 M0 M5 M9 T0 F20. S0.]
            SmoothieLineParserResultParserState,

            // [G54:0.000,0.000,0.000]
            // [G55:0.000,0.000,0.000]
            // [G56:0.000,0.000,0.000]
            // [G57:0.000,0.000,0.000]
            // [G58:0.000,0.000,0.000]
            // [G59:0.000,0.000,0.000]
            // [G28:0.000,0.000,0.000]
            // [G30:0.000,0.000,0.000]
            // [G92:0.000,0.000,0.000]
            // [TLO:0.000]
            // [PRB:0.000,0.000,0.000:0]
            SmoothieLineParserResultParameters,

            // Build version: edge-3332442, Build date: xxx, MCU: LPC1769, System Clock: 120MHz
            SmoothieLineParserResultVersion
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

export default SmoothieLineParser;
