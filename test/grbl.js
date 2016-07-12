import { test } from 'tap';
import trim from 'lodash/trim';
import Grbl from '../src/app/controllers/grbl/grbl';

// $10 - Status report mask:binary
// Report Type      | Value
// Machine Position | 1
// Work Position    | 2
// Planner Buffer   | 4
// RX Buffer        | 8
// Limit Pins       | 16
test('GrblLineParserResultStatus: all zeroes in the mask ($10=0)', (t) => {
    const grbl = new Grbl();
    grbl.on('status', ({ raw, ...status }) => {
        t.equal(raw, '<Idle>');
        t.same(status, {
            activeState: 'Idle',
            machinePosition: {
                x: '0.000',
                y: '0.000',
                z: '0.000'
            },
            workPosition: {
                x: '0.000',
                y: '0.000',
                z: '0.000'
            }
        });
        t.end();
    });

    const line = '<Idle>';
    grbl.parse(line);
});

test('GrblLineParserResultStatus: default ($10=3)', (t) => {
    const grbl = new Grbl();
    grbl.on('status', ({ raw, ...status }) => {
        t.equal(raw, '<Idle,MPos:5.529,0.560,7.000,WPos:1.529,-5.440,-0.000>');
        t.same(status, {
            activeState: 'Idle',
            machinePosition: {
                x: '5.529',
                y: '0.560',
                z: '7.000'
            },
            workPosition: {
                x: '1.529',
                y: '-5.440',
                z: '-0.000'
            }
        });
        t.end();
    });

    const line = '<Idle,MPos:5.529,0.560,7.000,WPos:1.529,-5.440,-0.000>';
    grbl.parse(line);
});

test('GrblLineParserResultStatus: 6-axis', (t) => {
    const grbl = new Grbl();
    grbl.on('status', ({ raw, ...status }) => {
        t.equal(raw, '<Idle,MPos:5.529,0.560,7.000,0.100,0.250,0.500,WPos:1.529,-5.440,-0.000,0.100,0.250,0.500>');
        t.same(status, {
            activeState: 'Idle',
            machinePosition: {
                x: '5.529',
                y: '0.560',
                z: '7.000',
                a: '0.100',
                b: '0.250',
                c: '0.500'
            },
            workPosition: {
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
    grbl.parse(line);
});

test('GrblLineParserResultStatus: set all bits to 1 ($10=31)', (t) => {
    const grbl = new Grbl();
    grbl.on('status', ({ raw, ...status }) => {
        t.equal(raw, '<Idle,MPos:5.529,0.560,7.000,WPos:1.529,-5.440,-0.000,Buf:0,RX:0,Lim:000>');
        t.same(status, {
            activeState: 'Idle',
            machinePosition: {
                x: '5.529',
                y: '0.560',
                z: '7.000'
            },
            workPosition: {
                x: '1.529',
                y: '-5.440',
                z: '-0.000'
            },
            plannerBuffer: '0',
            rxBuffer: '0',
            limitPins: '000'
        });
        t.end();
    });

    const line = '<Idle,MPos:5.529,0.560,7.000,WPos:1.529,-5.440,-0.000,Buf:0,RX:0,Lim:000>';
    grbl.parse(line);
});

test('GrblLineParserResultOk', (t) => {
    const grbl = new Grbl();
    grbl.on('ok', ({ raw }) => {
        t.equal(raw, 'ok');
        t.end();
    });

    const line = 'ok';
    grbl.parse(line);
});

test('GrblLineParserResultError', (t) => {
    const grbl = new Grbl();
    grbl.on('error', ({ raw, message }) => {
        t.equal(raw, 'error: Expected command letter');
        t.equal(message, 'Expected command letter');
        t.end();
    });

    const line = 'error: Expected command letter';
    grbl.parse(line);
});

test('GrblLineParserResultAlarm', (t) => {
    const grbl = new Grbl();
    grbl.on('alarm', ({ raw, message }) => {
        t.equal(raw, 'ALARM: Probe fail');
        t.equal(message, 'Probe fail');
        t.end();
    });

    const line = 'ALARM: Probe fail';
    grbl.parse(line);
});

test('GrblLineParserResultParserState', (t) => {
    const grbl = new Grbl();
    grbl.on('parserstate', ({ raw, ...parserstate }) => {
        t.equal(raw, '[G0 G54 G17 G21 G90 G94 M0 M5 M9 T0 F2540. S0.]');
        t.same(parserstate, {
            modal: {
                motion: 'G0', // G0, G1, G2, G3, G38.2, G38.3, G38.4, G38.5, G80
                coordinate: 'G54', // G54, G55, G56, G57, G58, G59
                plane: 'G17', // G17: xy-plane, G18: xz-plane, G19: yz-plane
                units: 'G21', // G20: Inches, G21: Millimeters
                distance: 'G90', // G90: Absolute, G91: Relative
                feedrate: 'G94', // G93: Inverse Time Mode, G94: Units Per Minutes
                program: 'M0',
                spindle: 'M5',
                coolant: 'M9'
            },
            tool: '0',
            feedrate: '2540.',
            spindle: '0.'
        });
        t.end();
    });

    const line = '[G0 G54 G17 G21 G90 G94 M0 M5 M9 T0 F2540. S0.]';
    grbl.parse(line);
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
    const grbl = new Grbl();
    let i = 0;
    grbl.on('parameters', ({ raw, ...full }) => {
        if (i < lines.length) {
            t.equal(raw, lines[i]);
        }
        if (full.G54) {
            t.same(full.G54, { x: '0.000', y: '0.000', z: '0.000' });
        }
        if (full.G55) {
            t.same(full.G55, { x: '0.000', y: '0.000', z: '0.000' });
        }
        if (full.G56) {
            t.same(full.G56, { x: '0.000', y: '0.000', z: '0.000' });
        }
        if (full.G57) {
            t.same(full.G57, { x: '0.000', y: '0.000', z: '0.000' });
        }
        if (full.G58) {
            t.same(full.G58, { x: '0.000', y: '0.000', z: '0.000' });
        }
        if (full.G59) {
            t.same(full.G59, { x: '0.000', y: '0.000', z: '0.000' });
        }
        if (full.G28) {
            t.same(full.G28, { x: '0.000', y: '0.000', z: '0.000' });
        }
        if (full.G30) {
            t.same(full.G30, { x: '0.000', y: '0.000', z: '0.000' });
        }
        if (full.G92) {
            t.same(full.G92, { x: '0.000', y: '0.000', z: '0.000' });
        }

        ++i;
        if (i >= lines.length) {
            t.end();
        }
    });

    lines.forEach(line => {
        grbl.parse(line);
    });
});

test('GrblLineParserResultParameters:TLO', (t) => {
    const grbl = new Grbl();
    grbl.on('parameters', ({ TLO, raw }) => {
        t.equal(raw, '[TLO:0.000]');
        t.same(TLO, { value: '0.000' });
        t.end();
    });

    grbl.parse('[TLO:0.000]');
});

test('GrblLineParserResultParameters:PRB', (t) => {
    const grbl = new Grbl();
    grbl.on('parameters', ({ PRB, raw }) => {
        t.equal(raw, '[PRB:0.000,0.000,1.492:1]');
        t.same(PRB, {
            result: 1,
            x: '0.000',
            y: '0.000',
            z: '1.492'
        });
        t.end();
    });

    grbl.parse('[PRB:0.000,0.000,1.492:1]');
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
    const grbl = new Grbl();
    let i = 0;
    grbl.on('feedback', ({ raw, ...full }) => {
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
        grbl.parse(line);
    });
});

test('GrblLineParserResultStartup', (t) => {
    const grbl = new Grbl();
    grbl.on('startup', ({ raw, version }) => {
        t.equal(raw, 'Grbl 0.9j [\'$\' for help]');
        t.equal(version, '0.9j');
        t.end();
    });

    const line = 'Grbl 0.9j [\'$\' for help]';
    grbl.parse(line);
});

test('Not supported output format', (t) => {
    const grbl = new Grbl();
    grbl.on('others', ({ raw }) => {
        t.equal(raw, 'Not supported output format');
        t.end();
    });

    const line = 'Not supported output format';
    grbl.parse(line);
});
