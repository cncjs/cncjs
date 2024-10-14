import { test } from 'tap';
import trim from 'lodash/trim';
import GrblRunner from '../src/server/controllers/Grbl/GrblRunner';

// $10 - Status report mask:binary
// Report Type      | Value
// Machine Position | 1
// Work Position    | 2
// Planner Buffer   | 4
// RX Buffer        | 8
// Limit Pins       | 16
test('GrblLineParserResultStatus: all zeroes in the mask ($10=0)', (t) => {
  const runner = new GrblRunner();
  runner.on('status', ({ raw, ...status }) => {
    t.equal(raw, '<Idle>');
    t.same(status, {
      activeState: 'Idle',
      subState: 0
    });
    t.end();
  });

  const line = '<Idle>';
  runner.parse(line);
});

test('GrblLineParserResultStatus: default ($10=3)', (t) => {
  const runner = new GrblRunner();
  runner.on('status', ({ raw, ...status }) => {
    t.equal(raw, '<Idle,MPos:5.529,0.560,7.000,WPos:1.529,-5.440,-0.000>');
    t.same(status, {
      activeState: 'Idle',
      subState: 0,
      mpos: {
        x: '5.529',
        y: '0.560',
        z: '7.000'
      },
      wpos: {
        x: '1.529',
        y: '-5.440',
        z: '-0.000'
      }
    });
    t.end();
  });

  const line = '<Idle,MPos:5.529,0.560,7.000,WPos:1.529,-5.440,-0.000>';
  runner.parse(line);
});

test('GrblLineParserResultStatus: 6-axis', (t) => {
  const runner = new GrblRunner();
  runner.on('status', ({ raw, ...status }) => {
    t.equal(raw, '<Idle,MPos:5.529,0.560,7.000,0.100,0.250,0.500,WPos:1.529,-5.440,-0.000,0.100,0.250,0.500>');
    t.same(status, {
      activeState: 'Idle',
      subState: 0,
      mpos: {
        x: '5.529',
        y: '0.560',
        z: '7.000',
        a: '0.100',
        b: '0.250',
        c: '0.500'
      },
      wpos: {
        x: '1.529',
        y: '-5.440',
        z: '-0.000',
        a: '0.100',
        b: '0.250',
        c: '0.500'
      }
    });
    t.end();
  });

  const line = '<Idle,MPos:5.529,0.560,7.000,0.100,0.250,0.500,WPos:1.529,-5.440,-0.000,0.100,0.250,0.500>';
  runner.parse(line);
});

test('GrblLineParserResultStatus: set all bits to 1 ($10=31)', (t) => {
  const runner = new GrblRunner();
  runner.on('status', ({ raw, ...status }) => {
    t.equal(raw, '<Idle,MPos:5.529,0.560,7.000,WPos:1.529,-5.440,-0.000,Buf:0,RX:0,Lim:000>');
    t.same(status, {
      activeState: 'Idle',
      subState: 0,
      mpos: {
        x: '5.529',
        y: '0.560',
        z: '7.000'
      },
      wpos: {
        x: '1.529',
        y: '-5.440',
        z: '-0.000'
      },
      buf: {
        planner: 0,
        rx: 0
      },
      pinState: ''
    });
    t.end();
  });

  const line = '<Idle,MPos:5.529,0.560,7.000,WPos:1.529,-5.440,-0.000,Buf:0,RX:0,Lim:000>';
  runner.parse(line);
});

test('GrblLineParserResultOk', (t) => {
  const runner = new GrblRunner();
  runner.on('ok', ({ raw }) => {
    t.equal(raw, 'ok');
    t.end();
  });

  const line = 'ok';
  runner.parse(line);
});

test('GrblLineParserResultError', (t) => {
  const runner = new GrblRunner();
  runner.on('error', ({ raw, message }) => {
    t.equal(raw, 'error: Expected command letter');
    t.equal(message, 'Expected command letter');
    t.end();
  });

  const line = 'error: Expected command letter';
  runner.parse(line);
});

test('GrblLineParserResultAlarm', (t) => {
  const runner = new GrblRunner();
  runner.on('alarm', ({ raw, message }) => {
    t.equal(raw, 'ALARM: Probe fail');
    t.equal(message, 'Probe fail');
    t.end();
  });

  const line = 'ALARM: Probe fail';
  runner.parse(line);
});

test('GrblLineParserResultAlarm: sets activeState', (t) => {
  const runner = new GrblRunner();
  runner.on('alarm', () => {
    t.equal(runner.state.status.activeState, 'Alarm');
    t.end();
  });

  const line = 'ALARM:2';
  runner.parse(line);
});

test('GrblLineParserResultParserState', (t) => {
  t.test('Grbl v0.9', (t) => {
    const runner = new GrblRunner();
    runner.on('parserstate', ({ raw, ...parserstate }) => {
      t.equal(raw, '[G0 G54 G17 G21 G90 G94 M0 M5 M9 T0 F2540. S0.]');
      t.same(parserstate, {
        modal: {
          motion: 'G0', // G0, G1, G2, G3, G38.2, G38.3, G38.4, G38.5, G80
          wcs: 'G54', // G54, G55, G56, G57, G58, G59
          plane: 'G17', // G17: xy-plane, G18: xz-plane, G19: yz-plane
          units: 'G21', // G20: Inches, G21: Millimeters
          distance: 'G90', // G90: Absolute, G91: Relative
          feedrate: 'G94', // G93: Inverse Time Mode, G94: Units Per Minutes
          program: 'M0', // M0, M1, M2, M30
          spindle: 'M5', // M3, M4, M5
          coolant: 'M9', // M7, M8, M9
        },
        tool: '0',
        feedrate: '2540.',
        spindle: '0.'
      });
      t.equal(runner.getTool(), 0);
      t.end();
    });

    const line = '[G0 G54 G17 G21 G90 G94 M0 M5 M9 T0 F2540. S0.]';
    runner.parse(line);
  });

  t.test('Grbl v1.x', (t) => {
    const runner = new GrblRunner();
    runner.on('parserstate', ({ raw, ...parserstate }) => {
      t.equal(raw, '[GC:G0 G54 G17 G21 G90 G94 M0 M5 M9 T0 F2540. S0.]');
      t.same(parserstate, {
        modal: {
          motion: 'G0', // G0, G1, G2, G3, G38.2, G38.3, G38.4, G38.5, G80
          wcs: 'G54', // G54, G55, G56, G57, G58, G59
          plane: 'G17', // G17: xy-plane, G18: xz-plane, G19: yz-plane
          units: 'G21', // G20: Inches, G21: Millimeters
          distance: 'G90', // G90: Absolute, G91: Relative
          feedrate: 'G94', // G93: Inverse Time Mode, G94: Units Per Minutes
          program: 'M0', // M0, M1, M2, M30
          spindle: 'M5', // M3, M4, M5
          coolant: 'M9', // M7, M8, M9
        },
        tool: '0',
        feedrate: '2540.',
        spindle: '0.',
      });
      t.equal(runner.getTool(), 0);
      t.end();
    });

    const line = '[GC:G0 G54 G17 G21 G90 G94 M0 M5 M9 T0 F2540. S0.]';
    runner.parse(line);
  });

  t.test('Grbl v1.x - mist coolant (M7) and flood coolant (M8)', (t) => {
    const runner = new GrblRunner();
    runner.on('parserstate', ({ raw, ...parserstate }) => {
      t.equal(raw, '[GC:G0 G54 G17 G21 G90 G94 M0 M3 M7 M8 T0 F2000 S20]');
      t.same(parserstate, {
        modal: {
          motion: 'G0', // G0, G1, G2, G3, G38.2, G38.3, G38.4, G38.5, G80
          wcs: 'G54', // G54, G55, G56, G57, G58, G59
          plane: 'G17', // G17: xy-plane, G18: xz-plane, G19: yz-plane
          units: 'G21', // G20: Inches, G21: Millimeters
          distance: 'G90', // G90: Absolute, G91: Relative
          feedrate: 'G94', // G93: Inverse Time Mode, G94: Units Per Minutes
          program: 'M0', // M0, M1, M2, M30
          spindle: 'M3', // M3, M4, M5
          coolant: ['M7', 'M8'], // M7, M8, M9
        },
        tool: '0',
        feedrate: '2000',
        spindle: '20',
      });
      t.equal(runner.getTool(), 0);
      t.end();
    });

    const line = '[GC:G0 G54 G17 G21 G90 G94 M0 M3 M7 M8 T0 F2000 S20]';
    runner.parse(line);
  });

  t.test('Handles cases where Grbl forks omit numeric values after the "M" field', (t) => {
    const runner = new GrblRunner();
    runner.on('parserstate', ({ raw, ...parserstate }) => {
      t.equal(raw, '[GC:G0 G54 G17 G21 G90 G94 M5 M M9 T0 F0 S0]');
      t.same(parserstate, {
        modal: {
          motion: 'G0', // G0, G1, G2, G3, G38.2, G38.3, G38.4, G38.5, G80
          wcs: 'G54', // G54, G55, G56, G57, G58, G59
          plane: 'G17', // G17: xy-plane, G18: xz-plane, G19: yz-plane
          units: 'G21', // G20: Inches, G21: Millimeters
          distance: 'G90', // G90: Absolute, G91: Relative
          feedrate: 'G94', // G93: Inverse Time Mode, G94: Units Per Minutes
          //program: undefined, // M0, M1, M2, M30
          spindle: 'M5', // M3, M4, M5
          coolant: 'M9', // M7, M8, M9
        },
        tool: '0',
        feedrate: '0',
        spindle: '0',
      });
      t.equal(runner.getTool(), 0);
      t.end();
    });

    const line = '[GC:G0 G54 G17 G21 G90 G94 M5 M M9 T0 F0 S0]';
    runner.parse(line);
  });

  t.test('Handles cases where Grbl forks omit numeric values after the "T" field', (t) => {
    const runner = new GrblRunner();
    runner.on('parserstate', ({ raw, ...parserstate }) => {
      t.equal(raw, '[GC:G0 G54 G17 G21 G90 G94 M5 M9 T F0 S0]');
      t.same(parserstate, {
        modal: {
          motion: 'G0', // G0, G1, G2, G3, G38.2, G38.3, G38.4, G38.5, G80
          wcs: 'G54', // G54, G55, G56, G57, G58, G59
          plane: 'G17', // G17: xy-plane, G18: xz-plane, G19: yz-plane
          units: 'G21', // G20: Inches, G21: Millimeters
          distance: 'G90', // G90: Absolute, G91: Relative
          feedrate: 'G94', // G93: Inverse Time Mode, G94: Units Per Minutes
          //program: undefined, // M0, M1, M2, M30
          spindle: 'M5', // M3, M4, M5
          coolant: 'M9', // M7, M8, M9
        },
        //tool: undefined,
        feedrate: '0',
        spindle: '0',
      });
      t.equal(runner.getTool(), 0);
      t.end();
    });

    const line = '[GC:G0 G54 G17 G21 G90 G94 M5 M9 T F0 S0]';
    runner.parse(line);
  });

  t.test('Handles invalid parser state output', (t) => {
    const runner = new GrblRunner();
    runner.on('parserstate', ({ raw, ...parserstate }) => {
      t.fail('Parser state should not be emitted for invalid input');
    });
    runner.on('feedback', ({ raw }) => {
      t.equal(raw, '[Invalid Parser State Output]');
      t.end();
    });
    const line = '[Invalid Parser State Output]';
    runner.parse(line);
  });

  t.end();
});

test('GrblLineParserResultParameters:G54,G55,G56,G57,G58,G59,G28,G30,G92', (t) => {
  const lines = [
    '[G54:0.000,0.000,0.000]',
    '[G55:0.000,0.000,0.000]',
    '[G56:0.000,0.000,0.000]',
    '[G57:0.000,0.000,0.000]',
    '[G58:0.000,0.000,0.000]',
    '[G59:0.000,0.000,0.000]',
    '[G28:0.000,0.000,0.000]',
    '[G30:0.000,0.000,0.000]',
    '[G92:0.000,0.000,0.000]'
  ];
  const runner = new GrblRunner();
  let i = 0;
  runner.on('parameters', ({ name, value, raw }) => {
    if (i < lines.length) {
      t.equal(raw, lines[i]);
    }
    if (name === 'G54') {
      t.same(value, { x: '0.000', y: '0.000', z: '0.000' });
    }
    if (name === 'G55') {
      t.same(value, { x: '0.000', y: '0.000', z: '0.000' });
    }
    if (name === 'G56') {
      t.same(value, { x: '0.000', y: '0.000', z: '0.000' });
    }
    if (name === 'G57') {
      t.same(value, { x: '0.000', y: '0.000', z: '0.000' });
    }
    if (name === 'G58') {
      t.same(value, { x: '0.000', y: '0.000', z: '0.000' });
    }
    if (name === 'G59') {
      t.same(value, { x: '0.000', y: '0.000', z: '0.000' });
    }
    if (name === 'G28') {
      t.same(value, { x: '0.000', y: '0.000', z: '0.000' });
    }
    if (name === 'G30') {
      t.same(value, { x: '0.000', y: '0.000', z: '0.000' });
    }
    if (name === 'G92') {
      t.same(value, { x: '0.000', y: '0.000', z: '0.000' });
    }

    ++i;
    if (i >= lines.length) {
      t.end();
    }
  });

  lines.forEach(line => {
    runner.parse(line);
  });
});

test('GrblLineParserResultParameters:TLO', (t) => {
  const runner = new GrblRunner();
  runner.on('parameters', ({ name, value, raw }) => {
    t.equal(raw, '[TLO:0.000]');
    t.equal(name, 'TLO');
    t.equal(value, '0.000');
    t.end();
  });

  runner.parse('[TLO:0.000]');
});

test('GrblLineParserResultParameters:PRB', (t) => {
  const runner = new GrblRunner();
  runner.on('parameters', ({ name, value, raw }) => {
    t.equal(raw, '[PRB:0.000,0.000,1.492:1]');
    t.equal(name, 'PRB');
    t.same(value, {
      result: 1,
      x: '0.000',
      y: '0.000',
      z: '1.492'
    });
    t.end();
  });

  runner.parse('[PRB:0.000,0.000,1.492:1]');
});

test('GrblLineParserResultFeedback', (t) => {
  const lines = [
    // $I - View build info
    '[0.9j.20160303:]',
    // Sent after an alarm message to tell the user to reset Grbl as an acknowledgement that an alarm has happened.
    '[Reset to continue]',
    // After an alarm and the user has sent a reset,
    '[\'$H\'|\'$X\' to unlock]',
    // This feedback message is sent when the user overrides the alarm.
    '[Caution: Unlocked]',
    // $C - Check gcode mode
    '[Enabled]',
    '[Disabled]'
  ];
  const runner = new GrblRunner();
  let i = 0;
  runner.on('feedback', ({ raw, ...full }) => {
    const message = trim(lines[i], '[]');

    if (i < lines.length) {
      t.equal(raw, lines[i]);
      t.equal(full.message, message);
    }

    ++i;
    if (i >= lines.length) {
      t.end();
    }
  });

  lines.forEach(line => {
    runner.parse(line);
  });
});

test('GrblLineParserResultSettings', (t) => {
  const lines = [
    '$1=25 (step idle delay, msec)',
    '$2=0 (step port invert mask:00000000)',
    '$3=0 (dir port invert mask:00000000)',
    '$4=0 (step enable invert, bool)',
    '$5=0 (limit pins invert, bool)',
    '$6=0 (probe pin invert, bool)',
    '$10=3 (status report mask:00000011)',
    '$11=0.020 (junction deviation, mm)',
    '$12=0.002 (arc tolerance, mm)',
    '$13=0 (report inches, bool)',
    '$20=0 (soft limits, bool)',
    '$21=0 (hard limits, bool)',
    '$22=0 (homing cycle, bool)',
    '$23=0 (homing dir invert mask:00000000)',
    '$24=25.000 (homing feed, mm/min)',
    '$25=500.000 (homing seek, mm/min)',
    '$26=250 (homing debounce, msec)',
    '$27=1.000 (homing pull-off, mm)',
    '$100=320.000 (x, step/mm)',
    '$101=320.000 (y, step/mm)',
    '$102=250.000 (z, step/mm)',
    '$110=2500.000 (x max rate, mm/min)',
    '$111=2500.000 (y max rate, mm/min)',
    '$112=500.000 (z max rate, mm/min)',
    '$120=250.000 (x accel, mm/sec^2)',
    '$121=250.000 (y accel, mm/sec^2)',
    '$122=50.000 (z accel, mm/sec^2)',
    '$130=200.000 (x max travel, mm)',
    '$131=200.000 (y max travel, mm)',
    '$132=200.000 (z max travel, mm)'
  ];
  const runner = new GrblRunner();
  let i = 0;
  runner.on('settings', ({ raw, name, value, message }) => {
    if (i < lines.length) {
      const r = raw.match(/^(\$[^=]+)=([^ ]*)\s*(.*)/);
      t.equal(raw, lines[i]);
      t.equal(name, r[1]);
      t.equal(value, r[2]);
      t.equal(message, trim(r[3], '()'));
    }

    ++i;
    if (i >= lines.length) {
      t.end();
    }
  });

  lines.forEach(line => {
    runner.parse(line);
  });
});

test('GrblLineParserResultStartup', (t) => {
  t.test('Grbl 0.9j', (t) => {
    const runner = new GrblRunner();
    runner.on('startup', ({ raw, firmware, version, message }) => {
      t.equal(raw, 'Grbl 0.9j [\'$\' for help]');
      t.equal(firmware, 'Grbl');
      t.equal(version, '0.9j');
      t.equal(message, '[\'$\' for help]');
      t.end();
    });

    const line = 'Grbl 0.9j [\'$\' for help]';
    runner.parse(line);
  });

  t.test('Grbl 1.1f', (t) => {
    const runner = new GrblRunner();
    runner.on('startup', ({ raw, firmware, version, message }) => {
      t.equal(raw, 'Grbl 1.1f [\'$\' for help]');
      t.equal(firmware, 'Grbl');
      t.equal(version, '1.1f');
      t.equal(message, '[\'$\' for help]');
      t.end();
    });

    const line = 'Grbl 1.1f [\'$\' for help]';
    runner.parse(line);
  });

  t.test('Custom firmware build', (t) => {
    const runner = new GrblRunner();
    runner.on('startup', ({ raw, firmware, version, message }) => {
      t.equal(raw, 'Grbl 1.2.3');
      t.equal(firmware, 'Grbl');
      t.equal(version, '1.2.3');
      t.equal(message, '');
      t.end();
    });

    const line = 'Grbl 1.2.3';
    runner.parse(line);
  });

  t.test('Custom firmware build: LongMill build #1', (t) => {
    const runner = new GrblRunner();
    runner.on('startup', ({ raw, firmware, version, message }) => {
      t.equal(raw, 'Grbl 1.1h: LongMill build [\'$\' for help]');
      t.equal(firmware, 'Grbl');
      t.equal(version, '1.1h');
      t.equal(message, ': LongMill build [\'$\' for help]');
      t.end();
    });

    const line = 'Grbl 1.1h: LongMill build [\'$\' for help]';
    runner.parse(line);
  });

  t.test('Custom firmware build: LongMill build #2', (t) => {
    const runner = new GrblRunner();
    runner.on('startup', ({ raw, firmware, version, message }) => {
      t.equal(raw, 'Grbl 1.1h [\'$\' for help] LongMill build Feb 25, 2020');
      t.equal(firmware, 'Grbl');
      t.equal(version, '1.1h');
      t.equal(message, '[\'$\' for help] LongMill build Feb 25, 2020');
      t.end();
    });

    const line = 'Grbl 1.1h [\'$\' for help] LongMill build Feb 25, 2020';
    runner.parse(line);
  });

  t.test('Custom firmware build: vCarvin', (t) => {
    const runner = new GrblRunner();
    runner.on('startup', ({ raw, firmware, version, message }) => {
      t.equal(raw, 'vCarvin 2.0.0 [\'$\' for help]');
      t.equal(firmware, 'vCarvin');
      t.equal(version, '2.0.0');
      t.equal(message, '[\'$\' for help]');
      t.end();
    });

    const line = 'vCarvin 2.0.0 [\'$\' for help]';
    runner.parse(line);
  });

  t.end();
});

test('Not supported output format', (t) => {
  const runner = new GrblRunner();
  runner.on('others', ({ raw }) => {
    t.equal(raw, 'Not supported output format');
    t.end();
  });

  const line = 'Not supported output format';
  runner.parse(line);
});
