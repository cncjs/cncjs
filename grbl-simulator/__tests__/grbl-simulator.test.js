/**
 * Unit Tests for GrblSimulator
 * Tests the core simulator functionality without network connections
 */

const GrblSimulator = require('../grbl-simulator');

// Simple test framework
let passed = 0;
let failed = 0;
const failures = [];

function describe(name, fn) {
    console.log(`\n${name}`);
    fn();
}

function it(name, fn) {
    try {
        fn();
        passed++;
        console.log(`  ✓ ${name}`);
    } catch (err) {
        failed++;
        console.log(`  ✗ ${name}`);
        console.log(`    ${err.message}`);
        failures.push({ name, error: err.message });
    }
}

function expect(actual) {
    return {
        toBe(expected) {
            if (actual !== expected) {
                throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
            }
        },
        toEqual(expected) {
            if (JSON.stringify(actual) !== JSON.stringify(expected)) {
                throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
            }
        },
        toContain(expected) {
            if (!actual.includes(expected)) {
                throw new Error(`Expected "${actual}" to contain "${expected}"`);
            }
        },
        toMatch(regex) {
            if (!regex.test(actual)) {
                throw new Error(`Expected "${actual}" to match ${regex}`);
            }
        },
        toBeGreaterThan(expected) {
            if (actual <= expected) {
                throw new Error(`Expected ${actual} to be greater than ${expected}`);
            }
        },
        toBeLessThan(expected) {
            if (actual >= expected) {
                throw new Error(`Expected ${actual} to be less than ${expected}`);
            }
        },
        toBeCloseTo(expected, precision = 2) {
            const diff = Math.abs(actual - expected);
            const epsilon = Math.pow(10, -precision) / 2;
            if (diff >= epsilon) {
                throw new Error(`Expected ${actual} to be close to ${expected} (diff: ${diff})`);
            }
        },
        toBeTruthy() {
            if (!actual) {
                throw new Error(`Expected ${actual} to be truthy`);
            }
        },
        toBeFalsy() {
            if (actual) {
                throw new Error(`Expected ${actual} to be falsy`);
            }
        }
    };
}

// =============================================================================
// Tests
// =============================================================================

describe('GrblSimulator - Initialization', () => {
    it('should initialize with default state', () => {
        const sim = new GrblSimulator();
        expect(sim.machineState).toBe('Idle');
        expect(sim.alarmCode).toBe(0);
    });

    it('should initialize machine position at origin', () => {
        const sim = new GrblSimulator();
        expect(sim.machinePosition.x).toBe(0);
        expect(sim.machinePosition.y).toBe(0);
        expect(sim.machinePosition.z).toBe(0);
    });

    it('should initialize with default parser state', () => {
        const sim = new GrblSimulator();
        expect(sim.parserState.motion).toBe('G0');
        expect(sim.parserState.coordinate).toBe('G54');
        expect(sim.parserState.plane).toBe('G17');
        expect(sim.parserState.distance).toBe('G90');
        expect(sim.parserState.units).toBe('G21');
    });

    it('should initialize with default settings', () => {
        const sim = new GrblSimulator();
        expect(sim.settings[110]).toBe(500.0); // X max rate
        expect(sim.settings[111]).toBe(500.0); // Y max rate
        expect(sim.settings[112]).toBe(500.0); // Z max rate
    });

    it('should return startup message', () => {
        const sim = new GrblSimulator();
        const msg = sim.getStartupMessage();
        expect(msg).toContain('Grbl 1.1h');
    });
});

describe('GrblSimulator - Real-time Commands', () => {
    it('should respond to status query (?)', () => {
        const sim = new GrblSimulator();
        const response = sim.processRealtimeCommand('?');
        expect(response).toContain('<Idle');
        expect(response).toContain('MPos:');
        expect(response).toContain('FS:');
    });

    it('should handle feed hold (!)', () => {
        const sim = new GrblSimulator();
        sim.machineState = 'Run';
        sim.processRealtimeCommand('!');
        expect(sim.machineState).toBe('Hold');
    });

    it('should handle cycle start (~)', () => {
        const sim = new GrblSimulator();
        sim.machineState = 'Hold';
        sim.processRealtimeCommand('~');
        expect(sim.machineState).toBe('Idle');
    });

    it('should handle soft reset (Ctrl-X)', () => {
        const sim = new GrblSimulator();
        sim.machinePosition = { x: 10, y: 20, z: 30 };
        sim.feedRate = 500;
        const response = sim.processRealtimeCommand('\x18');
        expect(response).toContain('Grbl');
        expect(sim.feedRate).toBe(0);
    });
});

describe('GrblSimulator - System Commands', () => {
    it('should list settings ($$)', () => {
        const sim = new GrblSimulator();
        const response = sim.processLine('$$');
        expect(response).toContain('$0=');
        expect(response).toContain('$110=');
        expect(response).toContain('ok\r\n');
    });

    it('should get parser state ($G)', () => {
        const sim = new GrblSimulator();
        const response = sim.processLine('$G');
        expect(response).toContain('[GC:');
        expect(response).toContain('G0');
        expect(response).toContain('G54');
        expect(response).toContain('ok\r\n');
    });

    it('should get build info ($I)', () => {
        const sim = new GrblSimulator();
        const response = sim.processLine('$I');
        expect(response).toContain('[VER:');
        expect(response).toContain('1.1h');
        expect(response).toContain('ok\r\n');
    });

    it('should get parameters ($#)', () => {
        const sim = new GrblSimulator();
        const response = sim.processLine('$#');
        expect(response).toContain('[G54:');
        expect(response).toContain('[G92:');
        expect(response).toContain('[PRB:');
        expect(response).toContain('ok\r\n');
    });

    it('should get startup blocks ($N)', () => {
        const sim = new GrblSimulator();
        const response = sim.processLine('$N');
        expect(response).toContain('$N0=');
        expect(response).toContain('$N1=');
        expect(response).toContain('ok\r\n');
    });

    it('should modify settings ($x=val)', () => {
        const sim = new GrblSimulator();
        const response = sim.processLine('$100=300');
        expect(response).toBe('ok\r\n');
        expect(sim.settings[100]).toBe(300);
    });

    it('should toggle check mode ($C)', () => {
        const sim = new GrblSimulator();
        expect(sim.machineState).toBe('Idle');

        let response = sim.processLine('$C');
        expect(response).toContain('Check mode enabled');
        expect(sim.machineState).toBe('Check');

        response = sim.processLine('$C');
        expect(response).toContain('Check mode disabled');
        expect(sim.machineState).toBe('Idle');
    });

    it('should kill alarm lock ($X)', () => {
        const sim = new GrblSimulator();
        sim.machineState = 'Alarm';
        sim.alarmCode = 1;

        const response = sim.processLine('$X');
        expect(response).toContain('Unlocked');
        expect(sim.machineState).toBe('Idle');
        expect(sim.alarmCode).toBe(0);
    });

    it('should enter sleep mode ($SLP)', () => {
        const sim = new GrblSimulator();
        const response = sim.processLine('$SLP');
        expect(response).toContain('Sleeping');
        expect(sim.machineState).toBe('Sleep');
    });
});

describe('GrblSimulator - G-code Parsing', () => {
    it('should parse G-code commands', () => {
        const sim = new GrblSimulator();
        const parsed = sim.parseGCodeLine('G0 X10 Y20 Z5 F500');

        expect(parsed.commands).toContain('G0');
        expect(parsed.coords.x).toBe(10);
        expect(parsed.coords.y).toBe(20);
        expect(parsed.coords.z).toBe(5);
        expect(parsed.words.F).toBe(500);
    });

    it('should normalize G-codes (G00 -> G0)', () => {
        const sim = new GrblSimulator();
        const parsed = sim.parseGCodeLine('G00 X10');
        expect(parsed.commands).toContain('G0');
    });

    it('should parse M-codes', () => {
        const sim = new GrblSimulator();
        const parsed = sim.parseGCodeLine('M3 S1000');
        expect(parsed.commands).toContain('M3');
        expect(parsed.words.S).toBe(1000);
    });

    it('should parse arc parameters (I, J, K, R)', () => {
        const sim = new GrblSimulator();
        const parsed = sim.parseGCodeLine('G2 X10 Y0 I5 J0');

        expect(parsed.commands).toContain('G2');
        expect(parsed.words.I).toBe(5);
        expect(parsed.words.J).toBe(0);
    });

    it('should parse negative values', () => {
        const sim = new GrblSimulator();
        const parsed = sim.parseGCodeLine('G1 X-10 Y-20 Z-5');

        expect(parsed.coords.x).toBe(-10);
        expect(parsed.coords.y).toBe(-20);
        expect(parsed.coords.z).toBe(-5);
    });

    it('should parse decimal values', () => {
        const sim = new GrblSimulator();
        const parsed = sim.parseGCodeLine('G1 X10.5 Y20.125 F100.5');

        expect(parsed.coords.x).toBe(10.5);
        expect(parsed.coords.y).toBe(20.125);
        expect(parsed.words.F).toBe(100.5);
    });
});

describe('GrblSimulator - Modal State Updates', () => {
    it('should update motion mode', () => {
        const sim = new GrblSimulator();
        expect(sim.parserState.motion).toBe('G0');

        sim.processLine('G1 F100');
        expect(sim.parserState.motion).toBe('G1');
    });

    it('should update distance mode', () => {
        const sim = new GrblSimulator();
        expect(sim.parserState.distance).toBe('G90');

        sim.processLine('G91');
        expect(sim.parserState.distance).toBe('G91');

        sim.processLine('G90');
        expect(sim.parserState.distance).toBe('G90');
    });

    it('should update units mode', () => {
        const sim = new GrblSimulator();
        expect(sim.parserState.units).toBe('G21');

        sim.processLine('G20');
        expect(sim.parserState.units).toBe('G20');

        sim.processLine('G21');
        expect(sim.parserState.units).toBe('G21');
    });

    it('should update plane selection', () => {
        const sim = new GrblSimulator();
        expect(sim.parserState.plane).toBe('G17');

        sim.processLine('G18');
        expect(sim.parserState.plane).toBe('G18');

        sim.processLine('G19');
        expect(sim.parserState.plane).toBe('G19');
    });

    it('should update coordinate system', () => {
        const sim = new GrblSimulator();
        expect(sim.parserState.coordinate).toBe('G54');

        sim.processLine('G55');
        expect(sim.parserState.coordinate).toBe('G55');
        expect(sim.activeWCS).toBe('G55');
    });

    it('should update spindle mode', () => {
        const sim = new GrblSimulator();
        expect(sim.parserState.spindle).toBe('M5');

        sim.processLine('M3 S1000');
        expect(sim.parserState.spindle).toBe('M3');
        expect(sim.spindleSpeed).toBe(1000);

        sim.processLine('M5');
        expect(sim.parserState.spindle).toBe('M5');
    });

    it('should update coolant mode', () => {
        const sim = new GrblSimulator();
        expect(sim.parserState.coolant).toBe('M9');

        sim.processLine('M8');
        expect(sim.parserState.coolant).toBe('M8');

        sim.processLine('M9');
        expect(sim.parserState.coolant).toBe('M9');
    });

    it('should update feed rate', () => {
        const sim = new GrblSimulator();
        expect(sim.feedRate).toBe(0);

        sim.processLine('G1 F500');
        expect(sim.feedRate).toBe(500);
    });
});

describe('GrblSimulator - Position Calculation', () => {
    it('should calculate absolute position', () => {
        const sim = new GrblSimulator();
        sim.parserState.distance = 'G90';

        const pos = sim.calculateMachinePosition({ x: 10, y: 20, z: 5 });
        expect(pos.x).toBe(10);
        expect(pos.y).toBe(20);
        expect(pos.z).toBe(5);
    });

    it('should calculate incremental position', () => {
        const sim = new GrblSimulator();
        sim.parserState.distance = 'G91';
        sim.machinePosition = { x: 10, y: 10, z: 10 };

        const pos = sim.calculateMachinePosition({ x: 5, y: -5, z: 0 }, sim.machinePosition);
        expect(pos.x).toBe(15);
        expect(pos.y).toBe(5);
        expect(pos.z).toBe(10);
    });

    it('should apply WCS offset in absolute mode', () => {
        const sim = new GrblSimulator();
        sim.workCoordinateOffsets['G54'] = { x: 10, y: 20, z: 0 };
        sim.parserState.distance = 'G90';

        const pos = sim.calculateMachinePosition({ x: 0, y: 0, z: 0 });
        expect(pos.x).toBe(10);
        expect(pos.y).toBe(20);
        expect(pos.z).toBe(0);
    });

    it('should apply G92 offset in absolute mode', () => {
        const sim = new GrblSimulator();
        sim.g92Offset = { x: 5, y: 5, z: 5 };
        sim.parserState.distance = 'G90';

        const pos = sim.calculateMachinePosition({ x: 0, y: 0, z: 0 });
        expect(pos.x).toBe(5);
        expect(pos.y).toBe(5);
        expect(pos.z).toBe(5);
    });

    it('should convert inches to mm', () => {
        const sim = new GrblSimulator();
        sim.parserState.units = 'G20'; // Inches
        sim.parserState.distance = 'G90';

        const pos = sim.calculateMachinePosition({ x: 1, y: 1, z: 0 });
        expect(pos.x).toBeCloseTo(25.4, 1);
        expect(pos.y).toBeCloseTo(25.4, 1);
    });
});

describe('GrblSimulator - G92 Coordinate Offset', () => {
    it('should set G92 offset', () => {
        const sim = new GrblSimulator();
        sim.machinePosition = { x: 50, y: 50, z: 50 };

        // G92 X0 Y0 Z0 means "current position is now 0,0,0"
        sim.processLine('G92 X0 Y0 Z0');

        // G92 offset = MPos - WCS - desired_WPos
        // With G54 at origin: G92 = 50 - 0 - 0 = 50
        expect(sim.g92Offset.x).toBe(50);
        expect(sim.g92Offset.y).toBe(50);
        expect(sim.g92Offset.z).toBe(50);
    });

    it('should clear G92 offset with G92.1', () => {
        const sim = new GrblSimulator();
        sim.g92Offset = { x: 10, y: 20, z: 30 };

        sim.processLine('G92.1');

        expect(sim.g92Offset.x).toBe(0);
        expect(sim.g92Offset.y).toBe(0);
        expect(sim.g92Offset.z).toBe(0);
    });
});

describe('GrblSimulator - G10 L2 Work Coordinate Offset', () => {
    it('should set G54 offset with G10 L2 P1', () => {
        const sim = new GrblSimulator();

        sim.processLine('G10 L2 P1 X10 Y20 Z5');

        expect(sim.workCoordinateOffsets['G54'].x).toBe(10);
        expect(sim.workCoordinateOffsets['G54'].y).toBe(20);
        expect(sim.workCoordinateOffsets['G54'].z).toBe(5);
    });

    it('should set G55 offset with G10 L2 P2', () => {
        const sim = new GrblSimulator();

        sim.processLine('G10 L2 P2 X100 Y100');

        expect(sim.workCoordinateOffsets['G55'].x).toBe(100);
        expect(sim.workCoordinateOffsets['G55'].y).toBe(100);
        expect(sim.workCoordinateOffsets['G55'].z).toBe(0);
    });
});

describe('GrblSimulator - Error Handling', () => {
    it('should reject commands in alarm state', () => {
        const sim = new GrblSimulator();
        sim.machineState = 'Alarm';

        const response = sim.processLine('G0 X10');
        expect(response).toBe('error:8\r\n');
    });

    it('should reject G1 without feed rate', () => {
        const sim = new GrblSimulator();
        sim.feedRate = 0;

        // G1 with feed rate 0 should return error:22
        // Note: processGCode returns error string directly when executeLinearMotion fails
        const result = sim.processLine('G1 X10');
        expect(result).toBe('error:22\r\n');
    });

    it('should reject line exceeding 80 characters', () => {
        const sim = new GrblSimulator();
        const longLine = 'G1 X' + '1'.repeat(80);

        const response = sim.processLine(longLine);
        expect(response).toBe('error:14\r\n');
    });

    it('should reject invalid system commands', () => {
        const sim = new GrblSimulator();

        const response = sim.processLine('$INVALID');
        expect(response).toBe('error:3\r\n');
    });

    it('should reject homing when disabled', () => {
        const sim = new GrblSimulator();
        sim.settings[22] = 0; // Homing disabled

        const response = sim.processLine('$H');
        expect(response).toBe('error:5\r\n');
    });
});

describe('GrblSimulator - Jogging', () => {
    it('should accept jog command in Idle state', () => {
        const sim = new GrblSimulator();
        expect(sim.machineState).toBe('Idle');

        const result = sim.processJogCommand('X10 F500');
        expect(result.error).toBe(null);
    });

    it('should reject jog without feed rate', () => {
        const sim = new GrblSimulator();

        const response = sim.processJogCommand('X10');
        expect(response).toBe('error:22\r\n');
    });

    it('should reject jog without axis words', () => {
        const sim = new GrblSimulator();

        const response = sim.processJogCommand('F500');
        expect(response).toBe('error:26\r\n');
    });

    it('should reject jog in non-Idle state', () => {
        const sim = new GrblSimulator();
        sim.machineState = 'Alarm';

        const response = sim.processJogCommand('X10 F500');
        expect(response).toBe('error:16\r\n');
    });

    it('should not modify parser state after jog', () => {
        const sim = new GrblSimulator();
        sim.feedRate = 100;

        sim.processJogCommand('X10 F500');

        // Feed rate should not be modified by jog
        expect(sim.feedRate).toBe(100);
    });
});

describe('GrblSimulator - Status Report', () => {
    it('should include state in status report', () => {
        const sim = new GrblSimulator();
        const report = sim.generateStatusReport();
        expect(report).toContain('<Idle');
    });

    it('should include position in status report', () => {
        const sim = new GrblSimulator();
        sim.machinePosition = { x: 10, y: 20, z: 5 };

        const report = sim.generateStatusReport();
        expect(report).toContain('10.000');
        expect(report).toContain('20.000');
        expect(report).toContain('5.000');
    });

    it('should include feed/spindle in status report', () => {
        const sim = new GrblSimulator();
        sim.feedRate = 500;
        sim.spindleSpeed = 1000;

        const report = sim.generateStatusReport();
        expect(report).toContain('FS:');
    });

    it('should include buffer state in status report', () => {
        const sim = new GrblSimulator();
        const report = sim.generateStatusReport();
        expect(report).toContain('Bf:');
    });

    it('should use MPos when $10 bit 0 is set', () => {
        const sim = new GrblSimulator();
        sim.settings[10] = 1; // Bit 0 = MPos

        const report = sim.generateStatusReport();
        expect(report).toContain('MPos:');
    });

    it('should use WPos when $10 bit 0 is not set', () => {
        const sim = new GrblSimulator();
        sim.settings[10] = 0; // Bit 0 = WPos

        const report = sim.generateStatusReport();
        expect(report).toContain('WPos:');
    });
});

describe('GrblSimulator - Motion State', () => {
    it('should initialize with inactive motion', () => {
        const sim = new GrblSimulator();
        expect(sim.motionState.active).toBe(false);
    });

    it('should have default motion state', () => {
        const sim = new GrblSimulator();
        const motionState = sim.motionState;

        expect(motionState.active).toBe(false);
        expect(motionState.type).toBe('linear');
        expect(motionState.startTime).toBe(0);
        expect(motionState.endTime).toBe(0);
    });

    it('should set motion state', () => {
        const sim = new GrblSimulator();
        sim.setMotionState({
            active: true,
            type: 'arc',
            startTime: 1000,
            endTime: 2000
        });

        expect(sim.motionState.active).toBe(true);
        expect(sim.motionState.type).toBe('arc');
        expect(sim.motionState.startTime).toBe(1000);
        expect(sim.motionState.endTime).toBe(2000);
    });

    it('should reset motion state', () => {
        const sim = new GrblSimulator();
        sim.setMotionState({ active: true, type: 'arc' });

        sim.resetMotionState();

        expect(sim.motionState.active).toBe(false);
        expect(sim.motionState.type).toBe('linear');
    });
});

describe('GrblSimulator - Linear Interpolation', () => {
    it('should return machine position when not in motion', () => {
        const sim = new GrblSimulator();
        sim.machinePosition = { x: 50, y: 50, z: 50 };

        const pos = sim.getCurrentPosition();
        expect(pos.x).toBe(50);
        expect(pos.y).toBe(50);
        expect(pos.z).toBe(50);
    });

    it('should interpolate position during linear motion', () => {
        const sim = new GrblSimulator();
        const now = Date.now();

        sim.setMotionState({
            active: true,
            type: 'linear',
            startTime: now - 500,  // Started 500ms ago
            endTime: now + 500,    // Ends in 500ms (total 1000ms)
            startPosition: { x: 0, y: 0, z: 0 },
            endPosition: { x: 100, y: 100, z: 0 },
            currentFeedRate: 6000
        });

        const pos = sim.getCurrentPosition();
        // At 50% progress, should be at ~50, 50
        expect(pos.x).toBeCloseTo(50, 0);
        expect(pos.y).toBeCloseTo(50, 0);
    });
});

describe('GrblSimulator - Arc Interpolation', () => {
    it('should interpolate arc position', () => {
        const sim = new GrblSimulator();

        // Setup arc motion data
        sim.setMotionState({
            active: true,
            type: 'arc',
            startTime: Date.now() - 500,
            endTime: Date.now() + 500,
            startPosition: { x: 10, y: 0, z: 0 },
            endPosition: { x: 0, y: 10, z: 0 },
            currentFeedRate: 1000,
            data: {
                center: { x: 0, y: 0, z: 0 },
                radius: 10,
                startAngle: 0,
                endAngle: Math.PI / 2,
                angularTravel: Math.PI / 2,
                isClockwise: false,
                plane: 'G17',
                axis0: 'x',
                axis1: 'y'
            }
        });

        const pos = sim.interpolateArcPosition(0.5);
        // At 50% of quarter circle, should be roughly at 45 degrees
        expect(pos.x).toBeCloseTo(7.07, 0);
        expect(pos.y).toBeCloseTo(7.07, 0);
    });
});

describe('GrblSimulator - Planner Buffer', () => {
    it('should initialize with empty planner', () => {
        const sim = new GrblSimulator();
        expect(sim.plannerBuffer.queue.length).toBe(0);
        expect(sim.plannerBuffer.executing).toBe(null);
    });

    it('should get planned end position from queue', () => {
        const sim = new GrblSimulator();
        sim.machinePosition = { x: 0, y: 0, z: 0 };

        sim.plannerBuffer.queue.push({
            endPosition: { x: 10, y: 20, z: 5 },
            execute: () => {} // Mock execute function
        });

        const pos = sim.getPlannedEndPosition();
        // Clean up immediately to prevent planner executor from running it
        sim.plannerBuffer.queue.length = 0;

        expect(pos.x).toBe(10);
        expect(pos.y).toBe(20);
        expect(pos.z).toBe(5);
    });

    it('should get planned end position from motion when no queue', () => {
        const sim = new GrblSimulator();
        sim.machinePosition = { x: 0, y: 0, z: 0 };

        sim.setMotionState({
            active: true,
            endPosition: { x: 50, y: 50, z: 0 }
        });

        const pos = sim.getPlannedEndPosition();
        expect(pos.x).toBe(50);
        expect(pos.y).toBe(50);
    });

    it('should get machine position when idle', () => {
        const sim = new GrblSimulator();
        sim.machinePosition = { x: 100, y: 100, z: 100 };

        const pos = sim.getPlannedEndPosition();
        expect(pos.x).toBe(100);
        expect(pos.y).toBe(100);
        expect(pos.z).toBe(100);
    });
});

describe('GrblSimulator - Soft Reset', () => {
    it('should clear buffers on reset', () => {
        const sim = new GrblSimulator();
        sim.receiveBuffer.queue.push({ line: 'test', length: 5 });
        sim.receiveBuffer.used = 5;
        sim.plannerBuffer.queue.push({
            endPosition: { x: 0, y: 0, z: 0 },
            execute: () => {} // Mock execute function
        });

        sim.reset();

        expect(sim.receiveBuffer.queue.length).toBe(0);
        expect(sim.receiveBuffer.used).toBe(0);
        expect(sim.plannerBuffer.queue.length).toBe(0);
    });

    it('should reset parser state on reset', () => {
        const sim = new GrblSimulator();
        sim.feedRate = 500;
        sim.spindleSpeed = 1000;
        sim.parserState.motion = 'G1';

        sim.reset();

        expect(sim.feedRate).toBe(0);
        expect(sim.spindleSpeed).toBe(0);
        expect(sim.parserState.motion).toBe('G0');
    });

    it('should trigger alarm if reset during motion', () => {
        const sim = new GrblSimulator();
        sim.setMotionState({ active: true });

        const response = sim.reset();

        expect(sim.machineState).toBe('Alarm');
        expect(sim.alarmCode).toBe(3);
        expect(response).toContain('ALARM:3');
    });
});

describe('GrblSimulator - Alarm System', () => {
    it('should trigger alarm with code', () => {
        const sim = new GrblSimulator();

        const response = sim.triggerAlarm(1);

        expect(sim.machineState).toBe('Alarm');
        expect(sim.alarmCode).toBe(1);
        expect(response).toBe('ALARM:1\r\n');
    });

    it('should clear planner on alarm', () => {
        const sim = new GrblSimulator();
        sim.plannerBuffer.queue.push({
            endPosition: { x: 0, y: 0, z: 0 },
            execute: () => {} // Mock execute function
        });

        sim.triggerAlarm(2);

        expect(sim.plannerBuffer.queue.length).toBe(0);
    });

    it('should stop motion on alarm', () => {
        const sim = new GrblSimulator();
        sim.setMotionState({ active: true });

        sim.triggerAlarm(2);

        expect(sim.motionState.active).toBe(false);
    });
});

describe('GrblSimulator - Soft Limits', () => {
    it('should detect exceeded soft limits', () => {
        const sim = new GrblSimulator();
        sim.settings[130] = 200; // X max travel
        sim.settings[131] = 200; // Y max travel
        sim.settings[132] = 200; // Z max travel

        const result = sim.checkSoftLimits({ x: 250, y: 0, z: 0 });
        expect(result.exceeded).toBe(true);
        expect(result.axis).toBe('x');
    });

    it('should pass within soft limits', () => {
        const sim = new GrblSimulator();
        sim.settings[130] = 200;
        sim.settings[131] = 200;
        sim.settings[132] = 200;

        const result = sim.checkSoftLimits({ x: 100, y: 100, z: 100 });
        expect(result.exceeded).toBe(false);
    });
});

describe('GrblSimulator - Dwell (G4)', () => {
    it('should return dwell marker for G4', () => {
        const sim = new GrblSimulator();

        const result = sim.processLine('G4 P1');

        expect(result.isDwell).toBe(true);
        expect(result.duration).toBe(1000); // 1 second = 1000ms
    });

    it('should reject G4 without P word', () => {
        const sim = new GrblSimulator();

        const response = sim.processLine('G4');
        expect(response).toBe('error:27\r\n');
    });
});

describe('GrblSimulator - Laser Mode ($32)', () => {
    it('should initialize with laser mode disabled', () => {
        const sim = new GrblSimulator();
        expect(sim.settings[32]).toBe(0);
        expect(sim.laserPower).toBe(0);
    });

    it('should turn off laser when laser mode disabled', () => {
        const sim = new GrblSimulator();
        sim.settings[32] = 0; // Laser mode OFF
        sim.processLine('M3 S1000');
        sim.processLine('G1 X10 F500');

        // Laser power should be 0 (laser mode disabled)
        expect(sim.laserPower).toBe(0);
    });

    it('should turn off laser during G0 in laser mode', () => {
        const sim = new GrblSimulator();
        sim.settings[32] = 1; // Laser mode ON
        sim.processLine('M3 S1000');
        sim.parserState.motion = 'G0';
        sim.updateLaserPower();

        expect(sim.laserPower).toBe(0);
    });

    it('should enable laser during G1 with M3 in laser mode', () => {
        const sim = new GrblSimulator();
        sim.settings[32] = 1; // Laser mode ON
        sim.processLine('M3 S750');
        sim.parserState.motion = 'G1';
        sim.motionState.active = true;
        sim.updateLaserPower();

        expect(sim.laserPower).toBe(750);
    });

    it('should enable laser during G2/G3 arcs in laser mode', () => {
        const sim = new GrblSimulator();
        sim.settings[32] = 1; // Laser mode ON
        sim.processLine('M3 S500');
        sim.parserState.motion = 'G2';
        sim.motionState.active = true;
        sim.updateLaserPower();

        expect(sim.laserPower).toBe(500);
    });

    it('should turn off laser when S0 in laser mode', () => {
        const sim = new GrblSimulator();
        sim.settings[32] = 1; // Laser mode ON
        sim.processLine('M3 S1000');
        sim.parserState.motion = 'G1';
        sim.motionState.active = true;
        sim.updateLaserPower();
        expect(sim.laserPower).toBe(1000);

        // Set S0 to turn off laser
        sim.spindleSpeed = 0;
        sim.updateLaserPower();
        expect(sim.laserPower).toBe(0);
    });

    it('should turn off laser when M5 in laser mode', () => {
        const sim = new GrblSimulator();
        sim.settings[32] = 1; // Laser mode ON
        sim.processLine('M3 S1000');
        sim.parserState.motion = 'G1';
        sim.motionState.active = true;
        sim.updateLaserPower();
        expect(sim.laserPower).toBe(1000);

        // M5 turns off spindle/laser
        sim.processLine('M5');
        sim.updateLaserPower();
        expect(sim.laserPower).toBe(0);
    });

    it('should turn off laser during Hold state', () => {
        const sim = new GrblSimulator();
        sim.settings[32] = 1; // Laser mode ON
        sim.processLine('M3 S1000');
        sim.parserState.motion = 'G1';
        sim.motionState.active = true;
        sim.updateLaserPower();
        expect(sim.laserPower).toBe(1000);

        // Feed hold should turn off laser
        sim.machineState = 'Hold';
        sim.updateLaserPower();
        expect(sim.laserPower).toBe(0);
    });

    it('should turn off laser during Door state', () => {
        const sim = new GrblSimulator();
        sim.settings[32] = 1; // Laser mode ON
        sim.processLine('M3 S1000');
        sim.parserState.motion = 'G1';
        sim.motionState.active = true;
        sim.updateLaserPower();
        expect(sim.laserPower).toBe(1000);

        // Door open should turn off laser immediately
        sim.machineState = 'Door';
        sim.updateLaserPower();
        expect(sim.laserPower).toBe(0);
    });

    it('should support M4 dynamic laser mode', () => {
        const sim = new GrblSimulator();
        sim.settings[32] = 1; // Laser mode ON
        sim.processLine('M4 S800'); // M4 = dynamic power mode
        sim.parserState.motion = 'G1';
        sim.motionState.active = true;
        sim.updateLaserPower();

        expect(sim.parserState.spindle).toBe('M4');
        expect(sim.laserPower).toBe(800);
    });

    it('should turn off laser when no motion is active', () => {
        const sim = new GrblSimulator();
        sim.settings[32] = 1; // Laser mode ON
        sim.processLine('M3 S1000');
        sim.parserState.motion = 'G1';
        sim.motionState.active = false; // No motion
        sim.updateLaserPower();

        expect(sim.laserPower).toBe(0);
    });
});

// =============================================================================
// Run Tests
// =============================================================================

console.log('Running GrblSimulator Unit Tests...');
console.log('='.repeat(60));

// Wait for planner executor interval to be created, then run tests
setTimeout(() => {
    // Tests will have run synchronously above

    console.log('\n' + '='.repeat(60));
    console.log(`Results: ${passed} passed, ${failed} failed`);

    if (failed > 0) {
        console.log('\nFailed tests:');
        failures.forEach(f => {
            console.log(`  - ${f.name}: ${f.error}`);
        });
        process.exit(1);
    } else {
        console.log('\nAll tests passed!');
        process.exit(0);
    }
}, 100);
