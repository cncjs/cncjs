import { ensureArray } from 'ensure-type';
import i18n from './i18n';

export default (word, group, object) => {
  const resText = {
    // Motion
    'G0': i18n._('Rapid Move (G0)', { ns: 'gcode' }),
    'G1': i18n._('Linear Move (G1)', { ns: 'gcode' }),
    'G2': i18n._('CW Arc (G2)', { ns: 'gcode' }),
    'G3': i18n._('CCW Arc (G3)', { ns: 'gcode' }),
    'G38.2': i18n._('Probing (G38.2)', { ns: 'gcode' }),
    'G38.3': i18n._('Probing (G38.3)', { ns: 'gcode' }),
    'G38.4': i18n._('Probing (G38.4)', { ns: 'gcode' }),
    'G38.5': i18n._('Probing (G38.5)', { ns: 'gcode' }),
    'G80': i18n._('Cancel Mode (G80)', { ns: 'gcode' }),

    // Work Coordinate System
    'G54': i18n._('P1 (G54)', { ns: 'gcode' }),
    'G55': i18n._('P2 (G55)', { ns: 'gcode' }),
    'G56': i18n._('P3 (G56)', { ns: 'gcode' }),
    'G57': i18n._('P4 (G57)', { ns: 'gcode' }),
    'G58': i18n._('P5 (G58)', { ns: 'gcode' }),
    'G59': i18n._('P6 (G59)', { ns: 'gcode' }),

    // Plane
    'G17': i18n._('XY Plane (G17)', { ns: 'gcode' }),
    'G18': i18n._('XZ Plane (G18)', { ns: 'gcode' }),
    'G19': i18n._('YZ Plane (G19)', { ns: 'gcode' }),

    // Units
    'G20': i18n._('Inches (G20)', { ns: 'gcode' }),
    'G21': i18n._('Millimeters (G21)', { ns: 'gcode' }),

    // Path
    'G61': i18n._('Exact Path (G61)', { ns: 'gcode' }),
    'G61.1': i18n._('Exact Stop (G61.1)', { ns: 'gcode' }),
    'G64': i18n._('Continuous (G64)', { ns: 'gcode' }),

    // Distance
    'G90': i18n._('Absolute (G90)', { ns: 'gcode' }),
    'G91': i18n._('Relative (G91)', { ns: 'gcode' }),

    // Feed Rate
    'G93': i18n._('Inverse Time (G93)', { ns: 'gcode' }),
    'G94': i18n._('Units/Min (G94)', { ns: 'gcode' }),

    // Tool Length Offset
    'G43.1': i18n._('Active Tool Offset (G43.1)', { ns: 'gcode' }),
    'G49': i18n._('No Tool Offset (G49)', { ns: 'gcode' }),

    // Program
    'M0': i18n._('Program Stop (M0)', { ns: 'gcode' }),
    'M1': i18n._('Optional Program Stop (M1)', { ns: 'gcode' }),
    'M2': i18n._('Program End (M2)', { ns: 'gcode' }),
    'M30': i18n._('Program End and Rewind (M30)', { ns: 'gcode' }),

    // Spindle
    'M3': i18n._('Spindle On, CW (M3)', { ns: 'gcode' }),
    'M4': i18n._('Spindle On, CCW (M4)', { ns: 'gcode' }),
    'M5': i18n._('Spindle Off (M5)', { ns: 'gcode' }),

    // Coolant
    'M7': i18n._('Mist Coolant On (M7)', { ns: 'gcode' }),
    'M8': i18n._('Flood Coolant On (M8)', { ns: 'gcode' }),
    'M9': i18n._('Coolant Off (M9)', { ns: 'gcode' })
  };

  const words = ensureArray(word)
    .map(word => (resText[word] || word));

  return (words.length > 1) ? words : words[0];
};
