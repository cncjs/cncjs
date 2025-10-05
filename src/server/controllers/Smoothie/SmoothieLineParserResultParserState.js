import { ensureArray } from 'ensure-type';
import _compact from 'lodash/compact';
import _find from 'lodash/find';
import _get from 'lodash/get';
import _includes from 'lodash/includes';
import _set from 'lodash/set';
import _trim from 'lodash/trim';
import {
  SMOOTHIE_MODAL_GROUPS
} from './constants';

class SmoothieLineParserResultParserState {
  // [G38.2 G54 G17 G21 G91 G94 M0 M5 M9 T0 F20. S0.]

  // Smoothieware edge as of 11/2020 has a hardcoded GC: prefixing the state
  // [GC:G0 G54 G17 G21 G90 G94 M0 M5 M9 T0 F2000.0 S2000.0]

  static parse(line) {
    const r = line.match(/^\[(GC:)?((?:[a-zA-Z][0-9]+(?:\.[0-9]*)?\s*)+)\]$/);
    if (!r) {
      return null;
    }

    const payload = {};
    const words = _compact(r[2].split(' '))
      .map((word) => {
        return _trim(word);
      });

    for (let i = 0; i < words.length; ++i) {
      const word = words[i];

      // Gx, Mx
      if (word.indexOf('G') === 0 || word.indexOf('M') === 0) {
        const r = _find(SMOOTHIE_MODAL_GROUPS, (group) => {
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
      type: SmoothieLineParserResultParserState,
      payload: payload
    };
  }
}

export default SmoothieLineParserResultParserState;
