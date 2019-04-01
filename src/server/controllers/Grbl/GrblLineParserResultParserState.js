import ensureArray from 'ensure-array';
import _compact from 'lodash/compact';
import _find from 'lodash/find';
import _get from 'lodash/get';
import _includes from 'lodash/includes';
import _set from 'lodash/set';
import _trim from 'lodash/trim';
import {
    GRBL_MODAL_GROUPS
} from './constants';

class GrblLineParserResultParserState {
    // * Grbl v0.9
    //   [G38.2 G54 G17 G21 G91 G94 M0 M5 M9 T0 F20. S0.]
    // * Grbl v1.1
    //   [GC:G0 G54 G17 G21 G90 G94 M0 M5 M9 T0 S0.0 F500.0]
    static parse(line) {
        const r = line.match(/^\[(?:GC:)?((?:[a-zA-Z][0-9]+(?:\.[0-9]*)?\s*)+)\]$/);
        if (!r) {
            return null;
        }

        const payload = {};
        const words = _compact(r[1].split(' '))
            .map((word) => {
                return _trim(word);
            });

        for (let i = 0; i < words.length; ++i) {
            const word = words[i];

            // Gx, Mx
            if (word.indexOf('G') === 0 || word.indexOf('M') === 0) {
                const r = _find(GRBL_MODAL_GROUPS, (group) => {
                    return _includes(group.modes, word);
                });

                if (!r) {
                    continue;
                }

                const prevWord = _get(payload, 'modal.' + r.group, '');
                if (prevWord) {
                    _set(payload, 'modal.' + r.group, ensureArray(prevWord).concat(word));
                } else {
                    _set(payload, 'modal.' + r.group, word);
                }

                continue;
            }

            // T: tool number
            if (word.indexOf('T') === 0) {
                _set(payload, 'tool', word.substring(1));
                continue;
            }

            // F: feed rate
            if (word.indexOf('F') === 0) {
                _set(payload, 'feedrate', word.substring(1));
                continue;
            }

            // S: spindle speed
            if (word.indexOf('S') === 0) {
                _set(payload, 'spindle', word.substring(1));
                continue;
            }
        }

        return {
            type: GrblLineParserResultParserState,
            payload: payload
        };
    }
}

export default GrblLineParserResultParserState;
