import ensureArray from 'ensure-array';
import _ from 'lodash';
import {
    SMOOTHIE_MODAL_GROUPS
} from './constants';

class SmoothieLineParserResultParserState {
    // [G38.2 G54 G17 G21 G91 G94 M0 M5 M9 T0 F20. S0.]
    static parse(line) {
        const r = line.match(/^\[((?:[a-zA-Z][0-9]+(?:\.[0-9]*)?\s*)+)\]$/);
        if (!r) {
            return null;
        }

        const payload = {};
        const words = _(r[1].split(' '))
            .compact()
            .map((word) => {
                return _.trim(word);
            })
            .value();

        for (let i = 0; i < words.length; ++i) {
            const word = words[i];

            // Gx, Mx
            if (word.indexOf('G') === 0 || word.indexOf('M') === 0) {
                const r = _.find(SMOOTHIE_MODAL_GROUPS, (group) => {
                    return _.includes(group.modes, word);
                });

                if (!r) {
                    continue;
                }

                const prevWord = _.get(payload, 'modal.' + r.group, '');
                if (prevWord) {
                    _.set(payload, 'modal.' + r.group, ensureArray(prevWord).concat(word));
                } else {
                    _.set(payload, 'modal.' + r.group, word);
                }

                continue;
            }

            // T: tool number
            if (word.indexOf('T') === 0) {
                _.set(payload, 'tool', word.substring(1));
                continue;
            }

            // F: feed rate
            if (word.indexOf('F') === 0) {
                _.set(payload, 'feedrate', word.substring(1));
                continue;
            }

            // S: spindle speed
            if (word.indexOf('S') === 0) {
                _.set(payload, 'spindle', word.substring(1));
                continue;
            }
        }

        return {
            type: SmoothieLineParserResultParserState,
            payload: payload
        };
    }
}

export default SmoothieLineParserResultParserState;
