import _includes from 'lodash/includes';
import _map from 'lodash/map';

const gcode = (cmd, nvObject) => {
  const s = _map(nvObject, (value, letter) => String(letter + value))
    .join(' ');
  return (s.length > 0) ? (cmd + ' ' + s) : cmd;
};

export const populateTLOProbeCommands = ({
  probeAxis,
  probeCommand,
  probeDepth,
  probeFeedrate,
  touchPlateHeight,
  retractionDistance,
}) => {
  const towardWorkpiece = _includes(['G38.2', 'G38.3'], probeCommand);
  const posname = `pos${probeAxis.toLowerCase()}`;
  const tloProbeCommands = [
    gcode('; Cancel tool length offset'),
    // Cancel tool length offset
    gcode('G49'),

    // Probe (use relative distance mode)
    gcode(`; ${probeAxis}-Probe`),
    gcode('G91'),
    gcode(probeCommand, {
      [probeAxis]: towardWorkpiece ? -probeDepth : probeDepth,
      F: probeFeedrate
    }),
    // Use absolute distance mode
    gcode('G90'),

    // Dwell
    gcode('; A dwell time of one second'),
    gcode('G4 P1'),

    // Apply touch plate height with tool length offset
    gcode('; Set tool length offset'),
    gcode('G43.1', {
      [probeAxis]: towardWorkpiece ? `[${posname}-${touchPlateHeight}]` : `[${posname}+${touchPlateHeight}]`,
    }),

    // Retract from the touch plate (use relative distance mode)
    gcode('; Retract from the touch plate'),
    gcode('G91'),
    gcode('G0', {
      [probeAxis]: retractionDistance,
    }),
    // Use asolute distance mode
    gcode('G90')
  ];

  return tloProbeCommands;
};

export const populateWCSProbeCommands = ({
  probeAxis,
  probeCommand,
  probeDepth,
  probeFeedrate,
  touchPlateHeight,
  retractionDistance,
  wcs,
}) => {
  const mapWCSToP = (wcs) => ({
    'G54': 1,
    'G55': 2,
    'G56': 3,
    'G57': 4,
    'G58': 5,
    'G59': 6,
  }[wcs] || 0);
  const towardWorkpiece = _includes(['G38.2', 'G38.3'], probeCommand);
  const wcsProbeCommands = [
    // Probe (use relative distance mode)
    gcode(`; ${probeAxis}-Probe`),
    gcode('G91'),
    gcode(probeCommand, {
      [probeAxis]: towardWorkpiece ? -probeDepth : probeDepth,
      F: probeFeedrate,
    }),
    // Use absolute distance mode
    gcode('G90'),

    // Set the WCS 0 offset
    gcode(`; Set the active WCS ${probeAxis}0`),
    gcode('G10', {
      L: 20,
      P: mapWCSToP(wcs),
      [probeAxis]: touchPlateHeight,
    }),

    // Retract from the touch plate (use relative distance mode)
    gcode('; Retract from the touch plate'),
    gcode('G91'),
    gcode('G0', {
      [probeAxis]: retractionDistance,
    }),
    // Use absolute distance mode
    gcode('G90')
  ];

  return wcsProbeCommands;
};
