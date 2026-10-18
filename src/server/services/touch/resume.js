// Start a program again from one of its lines (after a broken tool, a stop or
// a power cut). The state the program had built up to that line is replayed
// (units, plane, work offset, motion mode, feed, spindle, coolant, tool and
// position), and a preamble brings the machine there safely: rapid to the
// clearance height, rapid over the XY start, spindle and coolant back on with a
// spin-up dwell, plunge at the program's feed. Programs whose state cannot be
// known for sure are refused instead of guessed.
//
// Lines are numbered like the CNCjs sender counts them: non-empty lines,
// comment-only lines included, so the number shown during a job can be used.

const SPINUP_SECONDS = 3;

const refuse = (message) => {
  const err = new Error(message);
  err.status = 409;
  return err;
};

const clean = (line) => line.replace(/\([^)]*\)/g, ' ').replace(/;.*$/, '').trim().toUpperCase();

const words = (code) => {
  const out = [];
  const re = /([A-Z])\s*([-+]?(?:\d+\.?\d*|\.\d+))/g;
  let m;
  while ((m = re.exec(code))) {
    out.push([m[1], Number(m[2])]);
  }
  return out;
};

const fmt = (n) => String(Math.round(n * 10000) / 10000);

export const programLines = (gcode) => String(gcode).split('\n').filter((line) => line.trim().length > 0);

// State of the program just before line `from` (1-based, sender numbering).
export const stateBefore = (lines, from) => {
  const s = {
    units: 'G21',
distance: 'G90',
plane: 'G17',
wcs: 'G54',
feedMode: 'G94',
motion: null,
    feed: null,
plungeFeed: null,
speed: null,
spindle: 'M5',
coolant: 'M9',
tool: null,
toolChanged: false,
    pos: { X: null, Y: null, Z: null },
safeZ: null
  };
  for (let i = 0; i < from - 1; i++) {
    const code = clean(lines[i]);
    if (!code || code === '%') {
      continue;
    }
    const w = words(code);
    const g = w.filter(([l]) => l === 'G').map(([, v]) => v);
    const m = w.filter(([l]) => l === 'M').map(([, v]) => v);
    const at = (letter) => {
      const found = w.find(([l]) => l === letter);
      return found ? found[1] : null;
    };
    const lineNo = i + 1;
    if (g.some((v) => [10, 92, 92.1, 92.2, 92.3].includes(v))) {
      throw refuse('Le programme change l’origine (G10/G92) avant la ligne ' + from + ' (ligne ' + lineNo + ') : reprise impossible.');
    }
    if (g.includes(93)) {
      throw refuse('Avance inverse du temps (G93) avant la ligne ' + from + ' : reprise impossible.');
    }
    g.forEach((v) => {
      if (v === 20 || v === 21) {
        s.units = 'G' + v;
      } else if (v === 90 || v === 91) {
        s.distance = 'G' + v;
      } else if (v === 17 || v === 18 || v === 19) {
        s.plane = 'G' + v;
      } else if (v === 94) {
        s.feedMode = 'G94';
      } else if ([54, 55, 56, 57, 58, 59].includes(v)) {
        s.wcs = 'G' + v;
      } else if ([0, 1, 2, 3].includes(v)) {
        s.motion = 'G' + v;
      } else if (v === 80) {
        s.motion = null;
      }
    });
    if (at('F') !== null) {
      s.feed = at('F');
    }
    if (at('S') !== null) {
      s.speed = at('S');
    }
    if (at('T') !== null) {
      s.tool = at('T');
    }
    m.forEach((v) => {
      if (v === 3 || v === 4 || v === 5) {
        s.spindle = 'M' + v;
      } else if (v === 7 || v === 8 || v === 9) {
        s.coolant = 'M' + v;
      } else if (v === 6) {
        s.toolChanged = true;
      }
    });
    const machineMove = g.includes(53) || g.includes(28) || g.includes(30);
    const axes = ['X', 'Y', 'Z'].filter((a) => at(a) !== null);
    if (machineMove) {
      // G53/G28/G30 moves are in machine coordinates: the work position of
      // those axes is unknown until the program sets it again.
      (g.includes(53) ? axes : ['X', 'Y', 'Z']).forEach((a) => {
        s.pos[a] = null;
      });
      continue;
    }
    if (axes.length && (s.motion || g.some((v) => [0, 1, 2, 3].includes(v)))) {
      axes.forEach((a) => {
        const v = at(a);
        const before = s.pos[a];
        if (s.distance === 'G91') {
          s.pos[a] = s.pos[a] === null ? null : s.pos[a] + v;
        } else {
          s.pos[a] = v;
        }
        // The feed of the last cutting move down in Z is the plunge feed.
        const cutting = g.includes(1) || (!g.some((x) => [0, 2, 3].includes(x)) && s.motion === 'G1');
        if (a === 'Z' && cutting && before !== null && s.pos.Z !== null && s.pos.Z < before && s.feed > 0) {
          s.plungeFeed = s.feed;
        }
        if (a === 'Z' && s.pos.Z !== null) {
          s.safeZ = s.safeZ === null ? s.pos.Z : Math.max(s.safeZ, s.pos.Z);
        }
      });
    }
  }
  return s;
};

// Builds the program that restarts at line `from`.
export const buildResume = (gcode, from, { name = '' } = {}) => {
  const lines = programLines(gcode);
  if (!Number.isInteger(from) || from < 2 || from > lines.length) {
    throw refuse('Ligne de reprise invalide : choisissez entre 2 et ' + lines.length + '.');
  }
  const s = stateBefore(lines, from);
  if (s.distance === 'G91') {
    throw refuse('Le programme est en coordonnées relatives (G91) à la ligne ' + from + ' : reprise impossible.');
  }
  if (s.pos.X === null || s.pos.Y === null || s.pos.Z === null) {
    throw refuse('Position avant la ligne ' + from + ' inconnue (X, Y et Z doivent avoir été donnés en absolu) : choisissez une ligne plus loin.');
  }
  if (s.safeZ === null || s.safeZ < s.pos.Z) {
    throw refuse('Hauteur de dégagement inconnue avant la ligne ' + from + ' : choisissez une ligne plus loin.');
  }
  if (s.feed === null || s.feed <= 0) {
    throw refuse('Avance inconnue avant la ligne ' + from + ' : choisissez une ligne plus loin.');
  }
  const spindleOn = s.spindle === 'M3' || s.spindle === 'M4';
  if (spindleOn && !(s.speed > 0)) {
    throw refuse('Vitesse de broche inconnue avant la ligne ' + from + ' : reprise impossible.');
  }
  const preamble = [
    '(CNCjs Touch : reprise a la ligne ' + from + (name ? ' de ' + name.replace(/[()]/g, '') : '') + ')',
    [s.units, 'G90', s.plane, s.wcs, s.feedMode].join(' '),
    'G0 Z' + fmt(s.safeZ),
    'G0 X' + fmt(s.pos.X) + ' Y' + fmt(s.pos.Y)
  ];
  if (spindleOn) {
    preamble.push(s.spindle + ' S' + fmt(s.speed), 'G4 P' + SPINUP_SECONDS);
  }
  if (s.coolant !== 'M9') {
    preamble.push(s.coolant);
  }
  const plunge = s.plungeFeed || s.feed;
  preamble.push('G1 Z' + fmt(s.pos.Z) + ' F' + fmt(plunge));
  if (plunge !== s.feed) {
    preamble.push('F' + fmt(s.feed));
  }
  // A first line relying on the modal motion (e.g. "X10 Y5" after G1) gets it back.
  let first = lines[from - 1];
  const firstCode = clean(first);
  const hasAxis = /(^|[^A-Z])[XYZIJKR]\s*[-+]?[\d.]/.test(firstCode);
  const hasMotion = /(^|[^A-Z\d.])G0*[0123](?![\d.])/.test(firstCode);
  if (hasAxis && !hasMotion && s.motion) {
    first = s.motion + ' ' + first.trim();
  }
  const program = preamble.concat([first], lines.slice(from)).join('\n') + '\n';
  return {
    program,
    from,
    total: lines.length,
    line: lines[from - 1].trim().slice(0, 120),
    tool: s.tool,
    toolChanged: s.toolChanged,
    spindle: spindleOn ? { mode: s.spindle, speed: s.speed } : null,
    coolant: s.coolant !== 'M9' ? s.coolant : null,
    position: { ...s.pos },
    safeZ: s.safeZ,
    units: s.units,
    wcs: s.wcs,
    preamble
  };
};
