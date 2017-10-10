import { test } from 'tap';
import Smoothie from '../src/app/controllers/Smoothie/Smoothie';

// $10 - Status report mask:binary
// Report Type      | Value
// Machine Position | 1
// Work Position    | 2
// Planner Buffer   | 4
// RX Buffer        | 8
// Limit Pins       | 16
test('SmoothieLineParserResultStatus: all zeroes in the mask ($10=0)', (t) => {
    const smoothie = new Smoothie();
    smoothie.on('status', ({ raw, ...status }) => {
        t.equal(raw, '<Idle>');
        t.same(status, {
            activeState: 'Idle',
            subState: 0
        });
        t.end();
    });

    const line = '<Idle>';
    smoothie.parse(line);
});

test('SmoothieLineParserResultStatus: default ($10=3)', (t) => {
    const smoothie = new Smoothie();
    smoothie.on('status', ({ raw, ...status }) => {
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
    smoothie.parse(line);
});

test('SmoothieLineParserResultStatus: 6-axis', (t) => {
    const smoothie = new Smoothie();
    smoothie.on('status', ({ raw, ...status }) => {
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
    smoothie.parse(line);
});

test('SmoothieLineParserResultStatus: set all bits to 1 ($10=31)', (t) => {
    const smoothie = new Smoothie();
    smoothie.on('status', ({ raw, ...status }) => {
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
    smoothie.parse(line);
});

test('SmoothieLineParserResultOk', (t) => {
    const smoothie = new Smoothie();
    smoothie.on('ok', ({ raw }) => {
        t.equal(raw, 'ok');
        t.end();
    });

    const line = 'ok';
    smoothie.parse(line);
});

test('SmoothieLineParserResultError', (t) => {
    const smoothie = new Smoothie();
    smoothie.on('error', ({ raw, message }) => {
        t.equal(raw, 'error: Expected command letter');
        t.equal(message, 'Expected command letter');
        t.end();
    });

    const line = 'error: Expected command letter';
    smoothie.parse(line);
});

test('SmoothieLineParserResultAlarm', (t) => {
    const smoothie = new Smoothie();
    smoothie.on('alarm', ({ raw, message }) => {
        t.equal(raw, 'ALARM: Probe fail');
        t.equal(message, 'Probe fail');
        t.end();
    });

    const line = 'ALARM: Probe fail';
    smoothie.parse(line);
});

test('SmoothieLineParserResultParserState', (t) => {
    test('#1', (t) => {
        const smoothie = new Smoothie();
        smoothie.on('parserstate', ({ raw, ...parserstate }) => {
            t.equal(raw, '[G0 G54 G17 G21 G90 G94 M0 M5 M9 T0 F2540. S0.]');
            t.same(parserstate, {
                modal: {
                    motion: 'G0', // G0, G1, G2, G3, G38.2, G38.3, G38.4, G38.5, G80
                    wcs: 'G54', // G54, G55, G56, G57, G58, G59
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
        smoothie.parse(line);
    });

    test('#2', (t) => {
        const smoothie = new Smoothie();
        smoothie.on('parserstate', ({ raw, ...parserstate }) => {
            t.equal(raw, '[G0 G54 G17 G21 G90 G94 M0 M5 M7 M8 T0 F2540. S0.]');
            t.same(parserstate, {
                modal: {
                    motion: 'G0', // G0, G1, G2, G3, G38.2, G38.3, G38.4, G38.5, G80
                    wcs: 'G54', // G54, G55, G56, G57, G58, G59
                    plane: 'G17', // G17: xy-plane, G18: xz-plane, G19: yz-plane
                    units: 'G21', // G20: Inches, G21: Millimeters
                    distance: 'G90', // G90: Absolute, G91: Relative
                    feedrate: 'G94', // G93: Inverse Time Mode, G94: Units Per Minutes
                    program: 'M0',
                    spindle: 'M5',
                    coolant: ['M7', 'M8']
                },
                tool: '0',
                feedrate: '2540.',
                spindle: '0.'
            });
            t.end();
        });

        const line = '[G0 G54 G17 G21 G90 G94 M0 M5 M7 M8 T0 F2540. S0.]';
        smoothie.parse(line);
    });

    t.end();
});

test('SmoothieLineParserResultParameters:G54,G55,G56,G57,G58,G59,G28,G30,G92', (t) => {
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
    const smoothie = new Smoothie();
    let i = 0;
    smoothie.on('parameters', ({ name, value, raw }) => {
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
        smoothie.parse(line);
    });
});

test('SmoothieLineParserResultParameters:TLO', (t) => {
    const smoothie = new Smoothie();
    smoothie.on('parameters', ({ name, value, raw }) => {
        t.equal(raw, '[TLO:0.000]');
        t.equal(name, 'TLO');
        t.equal(value, '0.000');
        t.end();
    });

    smoothie.parse('[TLO:0.000]');
});

test('SmoothieLineParserResultParameters:PRB', (t) => {
    const smoothie = new Smoothie();
    smoothie.on('parameters', ({ name, value, raw }) => {
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

    smoothie.parse('[PRB:0.000,0.000,1.492:1]');
});

test('SmoothieLineParserResultVersion', (t) => {
    const smoothie = new Smoothie();
    smoothie.on('version', ({ raw, ...others }) => {
        t.equal(raw, 'Build version: edge-3332442, Build date: xxx, MCU: LPC1769, System Clock: 120MHz');
        t.same(others, {
            build: {
                version: 'edge-3332442',
                date: 'xxx'
            },
            mcu: 'LPC1769',
            sysclk: '120MHz'
        });
        t.end();
    });

    const line = 'Build version: edge-3332442, Build date: xxx, MCU: LPC1769, System Clock: 120MHz';
    smoothie.parse(line);
});

test('Not supported output format', (t) => {
    const smoothie = new Smoothie();
    smoothie.on('others', ({ raw }) => {
        t.equal(raw, 'Not supported output format');
        t.end();
    });

    const line = 'Not supported output format';
    smoothie.parse(line);
});
