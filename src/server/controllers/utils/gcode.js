import { ensureArray } from 'ensure-type';

export const isM0 = (x) => {
  const pattern = /^M0*0$/i; // matches 'M0', 'M00', 'm0', 'm00', and 'M000' (case-insensitive)
  return pattern.test(x);
};

export const isM1 = (x) => {
  const pattern = /^M0*1$/i; // matches 'M1', 'M01', 'm1', 'm01', and 'M001' (case-insensitive)
  return pattern.test(x);
};

export const isM6 = (x) => {
  const pattern = /^M0*6$/i; // matches 'M6', 'M06', 'm6', 'm06', and 'M006' (case-insensitive)
  return pattern.test(x);
};

export const isM109 = (x) => {
  const pattern = /^M0*109$/i;
  return pattern.test(x);
};

export const isM190 = (x) => {
  const pattern = /^M0*190$/i;
  return pattern.test(x);
};

export const replaceCommands = (gcode, commands, callback) => {
  commands = ensureArray(commands);
  if (!commands.length) {
    return gcode; // Return original if no commands are provided
  }

  const lines = gcode.split('\n');
  const re = new RegExp(`(\\d|\\b)(${commands.join('|')})(\\b|[a-zA-Z])`, 'gi');

  const updatedLines = lines.map(line => {
    return line.replace(re, (match, p1, p2, p3) => {
      const replacement = (typeof callback === 'function') ? callback(p2) ?? p2 : p2;
      return `${p1}${replacement}${p3}`;
    });
  });

  return updatedLines.join('\n');
};

export const replaceM6 = (gcode, callback) => {
  // M6, M06, m6, m06, and M006 all refer to the same command "M6"
  return replaceCommands(gcode, ['M0*6'], callback);
};
