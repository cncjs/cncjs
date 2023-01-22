import _ from 'lodash';
import GrblLineParserResultStatus from './GrblLineParserResultStatus';
import GrblLineParserResultOk from './GrblLineParserResultOk';
import GrblLineParserResultError from './GrblLineParserResultError';
import GrblLineParserResultAlarm from './GrblLineParserResultAlarm';
import GrblLineParserResultParserState from './GrblLineParserResultParserState';
import GrblLineParserResultParameters from './GrblLineParserResultParameters';
import GrblLineParserResultHelp from './GrblLineParserResultHelp';
import GrblLineParserResultVersion from './GrblLineParserResultVersion';
import GrblLineParserResultOption from './GrblLineParserResultOption';
import GrblLineParserResultEcho from './GrblLineParserResultEcho';
import GrblLineParserResultFeedback from './GrblLineParserResultFeedback';
import GrblLineParserResultSettings from './GrblLineParserResultSettings';
import GrblLineParserResultStartup from './GrblLineParserResultStartup';

// Grbl v1.1
// https://github.com/gnea/grbl/blob/edge/doc/markdown/interface.md

class GrblLineParser {
  parse(line) {
    const parsers = [
      // <>
      GrblLineParserResultStatus,

      // ok
      GrblLineParserResultOk,

      // error:x
      GrblLineParserResultError,

      // ALARM:
      GrblLineParserResultAlarm,

      // [G38.2 G54 G17 G21 G91 G94 M0 M5 M9 T0 F20. S0.] (v0.9)
      // [GC:G38.2 G54 G17 G21 G91 G94 M0 M5 M9 T0 F20. S0.] (v1.1)
      GrblLineParserResultParserState,

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
      GrblLineParserResultParameters,

      // [HLP:] (v1.1)
      GrblLineParserResultHelp,

      // [VER:] (v1.1)
      GrblLineParserResultVersion,

      // [OPT:] (v1.1)
      GrblLineParserResultOption,

      // [echo:] (v1.1)
      GrblLineParserResultEcho,

      // [] (v0.9)
      // [MSG:] (v1.1)
      GrblLineParserResultFeedback,

      // $xx
      GrblLineParserResultSettings,

      // Grbl X.Xx ['$' for help]
      GrblLineParserResultStartup
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

export default GrblLineParser;
