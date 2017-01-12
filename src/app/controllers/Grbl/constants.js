// Grbl
export const GRBL = 'Grbl';

// Active State
export const GRBL_ACTIVE_STATE_IDLE = 'Idle';
export const GRBL_ACTIVE_STATE_RUN = 'Run';
export const GRBL_ACTIVE_STATE_HOLD = 'Hold';
export const GRBL_ACTIVE_STATE_DOOR = 'Door';
export const GRBL_ACTIVE_STATE_HOME = 'Home';
export const GRBL_ACTIVE_STATE_ALARM = 'Alarm';
export const GRBL_ACTIVE_STATE_CHECK = 'Check';

// Real-time Commands: ~, !, ?, and Ctrl-x
export const GRBL_REALTIME_COMMANDS = [
    '~', // Cycle Start
    '!', // Feed Hold
    '?', // Current Status
    '\x18' // Reset Grbl (Ctrl-X)
];

// https://github.com/grbl/grbl/wiki/Configuring-Grbl-v0.9
// http://linuxcnc.org/docs/html/gcode/overview.html#cap:modal-groups
export const GRBL_MODAL_GROUPS = [
    { // Motion Mode (Defaults to G0)
        group: 'motion',
        modes: ['G0', 'G1', 'G2', 'G3', 'G38.2', 'G38.3', 'G38.4', 'G38.5', 'G80']
    },
    { // Coordinate System Select (Defaults to G54)
        group: 'coordinate',
        modes: ['G54', 'G55', 'G56', 'G57', 'G58', 'G59']
    },
    { // Plane Select (Defaults to G17)
        group: 'plane',
        modes: ['G17', 'G18', 'G19']
    },
    { // Units Mode (Defaults to G21)
        group: 'units',
        modes: ['G20', 'G21']
    },
    { // Distance Mode (Defaults to G90)
        group: 'distance',
        modes: ['G90', 'G91']
    },
    { // Feed Rate Mode (Defaults to G94)
        group: 'feedrate',
        modes: ['G93', 'G94']
    },
    { // Program Mode (Defaults to M0)
        group: 'program',
        modes: ['M0', 'M1', 'M2', 'M30']
    },
    { // Spindle State (Defaults to M5)
        group: 'spindle',
        modes: ['M3', 'M4', 'M5']
    },
    { // Coolant State (Defaults to M9)
        group: 'coolant',
        modes: ['M7', 'M8', 'M9']
    }
];

// Errors
// https://github.com/gnea/grbl-Mega/blob/edge/doc/csv/error_codes_en_US.csv
export const GRBL_ERRORS = [
    {
        code: 1,
        msg: 'Expected command letter',
        desc: 'G-code words consist of a letter and a value. Letter was not found.'
    },
    {
        code: 2,
        msg: 'Bad number format',
        desc: 'Missing the expected G-code word value or numeric value format is not valid.'
    },
    {
        code: 3,
        msg: 'Invalid statement',
        desc: 'Grbl \$\' system command was not recognized or supported.'
    },
    {
        code: 4,
        msg: 'Value < 0',
        desc: 'Negative value received for an expected positive value.'
    },
    {
        code: 5,
        msg: 'Setting disabled',
        desc: 'Homing cycle failure. Homing is not enabled via settings.'
    },
    {
        code: 6,
        msg: 'Value < 3 usec',
        desc: 'Minimum step pulse time must be greater than 3usec.'
    },
    {
        code: 7,
        msg: 'EEPROM read fail. Using defaults',
        desc: 'An EEPROM read failed. Auto-restoring affected EEPROM to default values.'
    },
    {
        code: 8,
        msg: 'Not idle',
        desc: 'Grbl \'$\' command cannot be used unless Grbl is IDLE. Ensures smooth operation during a job.'
    },
    {
        code: 9,
        msg: 'G-code lock',
        desc: 'G-code commands are locked out during alarm or jog state.'
    },
    {
        code: 10,
        msg: 'Homing not enabled',
        desc: 'Soft limits cannot be enabled without homing also enabled.'
    },
    {
        code: 11,
        msg: 'Line overflow',
        desc: 'Max characters per line exceeded. Received command line was not executed.'
    },
    {
        code: 12,
        msg: 'Step rate > 30kHz',
        desc: 'Grbl \'$\' setting value cause the step rate to exceed the maximum supported.'
    },
    {
        code: 13,
        msg: 'Check Door',
        desc: 'Safety door detected as opened and door state initiated.'
    },
    {
        code: 14,
        msg: 'Line length exceeded',
        desc: 'Build info or startup line exceeded EEPROM line length limit. Line not stored.'
    },
    {
        code: 15,
        msg: 'Travel exceeded',
        desc: 'Jog target exceeds machine travel. Jog command has been ignored.'
    },
    {
        code: 16,
        msg: 'Invalid jog command',
        desc: 'Jog command has no \'=\' or contains prohibited g-code.'
    },
    {
        code: 20,
        msg: 'Unsupported command',
        desc: 'Unsupported or invalid g-code command found in block.'
    },
    {
        code: 21,
        msg: 'Modal group violation',
        desc: 'More than one g-code command from same modal group found in block.'
    },
    {
        code: 22,
        msg: 'Undefined feed rate',
        desc: 'Feed rate has not yet been set or is undefined.'
    },
    {
        code: 23,
        msg: 'Invalid gcode ID:23',
        desc: 'G-code command in block requires an integer value.'
    },
    {
        code: 24,
        msg: 'Invalid gcode ID:24',
        desc: 'More than one g-code command that requires axis words found in block.'
    },
    {
        code: 25,
        msg: 'Invalid gcode ID:25',
        desc: 'Repeated g-code word found in block.'
    },
    {
        code: 26,
        msg: 'Invalid gcode ID:26',
        desc: 'No axis words found in block for g-code command or current modal state which requires them.'
    },
    {
        code: 27,
        msg: 'Invalid gcode ID:27',
        desc: 'Line number value is invalid.'
    },
    {
        code: 28,
        msg: 'Invalid gcode ID:28',
        desc: 'G-code command is missing a required value word.'
    },
    {
        code: 29,
        msg: 'Invalid gcode ID:29',
        desc: 'G59.x work coordinate systems are not supported.'
    },
    {
        code: 30,
        msg: 'Invalid gcode ID:30',
        desc: 'G53 only allowed with G0 and G1 motion modes.'
    },
    {
        code: 31,
        msg: 'Invalid gcode ID:31',
        desc: 'Axis words found in block when no command or current modal state uses them.'
    },
    {
        code: 32,
        msg: 'Invalid gcode ID:32',
        desc: 'G2 and G3 arcs require at least one in-plane axis word.'
    },
    {
        code: 33,
        msg: 'Invalid gcode ID:33',
        desc: 'Motion command target is invalid.'
    },
    {
        code: 34,
        msg: 'Invalid gcode ID:34',
        desc: 'Arc radius value is invalid.'
    },
    {
        code: 35,
        msg: 'Invalid gcode ID:35',
        desc: 'G2 and G3 arcs require at least one in-plane offset word.'
    },
    {
        code: 36,
        msg: 'Invalid gcode ID:36',
        desc: 'Unused value words found in block.'
    },
    {
        code: 37,
        msg: 'Invalid gcode ID:37',
        desc: 'G43.1 dynamic tool length offset is not assigned to configured tool length axis.'
    }
];

// Alarms
// https://github.com/gnea/grbl-Mega/blob/edge/doc/csv/alarm_codes_en_US.csv
export const GRBL_ALARMS = [
    {
        code: 1,
        msg: 'Hard limit',
        desc: 'Hard limit has been triggered. Machine position is likely lost due to sudden halt. Re-homing is highly recommended.'
    },
    {
        code: 2,
        msg: 'Soft limit',
        desc: 'Soft limit alarm. G-code motion target exceeds machine travel. Machine position retained. Alarm may be safely unlocked.'
    },
    {
        code: 3,
        msg: 'Abort during cycle',
        desc: 'Reset while in motion. Machine position is likely lost due to sudden halt. Re-homing is highly recommended.'
    },
    {
        code: 4,
        msg: 'Probe fail',
        desc: 'Probe fail. Probe is not in the expected initial state before starting probe cycle when G38.2 and G38.3 is not triggered and G38.4 and G38.5 is triggered.'
    },
    {
        code: 5,
        msg: 'Probe fail',
        desc: 'Probe fail. Probe did not contact the workpiece within the programmed travel for G38.2 and G38.4.'
    },
    {
        code: 6,
        msg: 'Homing fail',
        desc: 'Homing fail. The active homing cycle was reset.'
    },
    {
        code: 7,
        msg: 'Homing fail',
        desc: 'Homing fail. Safety door was opened during homing cycle.'
    },
    {
        code: 8,
        msg: 'Homing fail',
        desc: 'Homing fail. Pull off travel failed to clear limit switch. Try increasing pull-off setting or check wiring.'
    },
    {
        code: 9,
        msg: 'Homing fail',
        desc: 'Homing fail. Could not find limit switch within search distances. Try increasing max travel, decreasing pull-off distance, or check wiring.'
    }
];

// Settings
// https://github.com/gnea/grbl-Mega/blob/edge/doc/csv/setting_codes_en_US.csv
export const GRBL_SETTINGS = [
    {
        code: 0,
        name: 'Step pulse time',
        units: 'microseconds',
        desc: 'Sets time length per step. Minimum 3usec.'
    },
    {
        code: 1,
        name: 'Step idle delay',
        units: 'milliseconds',
        desc: 'Sets a short hold delay when stopping to let dynamics settle before disabling steppers. Value 255 keeps motors enabled with no delay.'
    },
    {
        code: 2,
        name: 'Step pulse invert',
        units: 'mask',
        desc: 'Inverts the step signal. Set axis bit to invert (00000ZYX).'
    },
    {
        code: 3,
        name: 'Step direction invert',
        units: 'mask',
        desc: 'Inverts the direction signal. Set axis bit to invert (00000ZYX).'
    },
    {
        code: 4,
        name: 'Invert step enable pin',
        units: 'boolean',
        desc: 'Inverts the stepper driver enable pin signal.'
    },
    {
        code: 5,
        name: 'Invert limit pins',
        units: 'boolean',
        desc: 'Inverts the all of the limit input pins.'
    },
    {
        code: 6,
        name: 'Invert probe pin',
        units: 'boolean',
        desc: 'Inverts the probe input pin signal.'
    },
    {
        code: 10,
        name: 'Status report options',
        units: 'mask',
        desc: 'Alters data included in status reports.'
    },
    {
        code: 11,
        name: 'Junction deviation',
        units: 'millimeters',
        desc: 'Sets how fast Grbl travels through consecutive motions. Lower value slows it down.'
    },
    {
        code: 12,
        name: 'Arc tolerance',
        units: 'millimeters',
        desc: 'Sets the G2 and G3 arc tracing accuracy based on radial error. Beware: A very small value may effect performance.'
    },
    {
        code: 13,
        name: 'Report in inches',
        units: 'boolean',
        desc: 'Enables inch units when returning any position and rate value that is not a settings value.'
    },
    {
        code: 20,
        name: 'Soft limits enable',
        units: 'boolean',
        desc: 'Enables soft limits checks within machine travel and sets alarm when exceeded. Requires homing.'
    },
    {
        code: 21,
        name: 'Hard limits enable',
        units: 'boolean',
        desc: 'Enables hard limits. Immediately halts motion and throws an alarm when switch is triggered.'
    },
    {
        code: 22,
        name: 'Homing cycle enable',
        units: 'boolean',
        desc: 'Enables homing cycle. Requires limit switches on all axes.'
    },
    {
        code: 23,
        name: 'Homing direction invert',
        units: 'mask',
        desc: 'Homing searches for a switch in the positive direction. Set axis bit (00000ZYX) to search in negative direction.'
    },
    {
        code: 24,
        name: 'Homing locate feed rate',
        units: 'mm/min',
        desc: 'Feed rate to slowly engage limit switch to determine its location accurately.'
    },
    {
        code: 25,
        name: 'Homing search seek rate',
        units: 'mm/min',
        desc: 'Seek rate to quickly find the limit switch before the slower locating phase.'
    },
    {
        code: 26,
        name: 'Homing switch debounce delay',
        units: 'milliseconds',
        desc: 'Sets a short delay between phases of homing cycle to let a switch debounce.'
    },
    {
        code: 27,
        name: 'Homing switch pull-off distance',
        units: 'millimeters',
        desc: 'Retract distance after triggering switch to disengage it. Homing will fail if switch isn\'t cleared.'
    },
    {
        code: 30,
        name: 'Maximum spindle speed',
        units: 'RPM',
        desc: 'Maximum spindle speed. Sets PWM to 100% duty cycle.'
    },
    {
        code: 31,
        name: 'Minimum spindle speed',
        units: 'RPM',
        desc: 'Minimum spindle speed. Sets PWM to 0.4% or lowest duty cycle.'
    },
    {
        code: 32,
        name: 'Laser-mode enable',
        units: 'boolean',
        desc: 'Enables laser mode. Consecutive G1/2/3 commands will not halt when spindle speed is changed.'
    },
    {
        code: 100,
        name: 'X-axis travel resolution',
        units: 'step/mm',
        desc: 'X-axis travel resolution in steps per millimeter.'
    },
    {
        code: 101,
        name: 'Y-axis travel resolution',
        units: 'step/mm',
        desc: 'Y-axis travel resolution in steps per millimeter.'
    },
    {
        code: 102,
        name: 'Z-axis travel resolution',
        units: 'step/mm',
        desc: 'Z-axis travel resolution in steps per millimeter.'
    },
    {
        code: 110,
        name: 'X-axis maximum rate',
        units: 'mm/min',
        desc: 'X-axis maximum rate. Used as G0 rapid rate.'
    },
    {
        code: 111,
        name: 'Y-axis maximum rate',
        units: 'mm/min',
        desc: 'Y-axis maximum rate. Used as G0 rapid rate.'
    },
    {
        code: 112,
        name: 'Z-axis maximum rate',
        units: 'mm/min',
        desc: 'Z-axis maximum rate. Used as G0 rapid rate.'
    },
    {
        code: 120,
        name: 'X-axis acceleration',
        units: 'mm/sec^2',
        desc: 'X-axis acceleration. Used for motion planning to not exceed motor torque and lose steps.'
    },
    {
        code: 121,
        name: 'Y-axis acceleration',
        units: 'mm/sec^2',
        desc: 'Y-axis acceleration. Used for motion planning to not exceed motor torque and lose steps.'
    },
    {
        code: 122,
        name: 'Z-axis acceleration',
        units: 'mm/sec^2',
        desc: 'Z-axis acceleration. Used for motion planning to not exceed motor torque and lose steps.'
    },
    {
        code: 130,
        name: 'X-axis maximum travel',
        units: 'millimeters',
        desc: 'Maximum X-axis travel distance from homing switch. Determines valid machine space for soft-limits and homing search distances.'
    },
    {
        code: 131,
        name: 'Y-axis maximum travel',
        units: 'millimeters',
        desc: 'Maximum Y-axis travel distance from homing switch. Determines valid machine space for soft-limits and homing search distances.'
    },
    {
        code: 132,
        name: 'Z-axis maximum travel',
        units: 'millimeters',
        desc: 'Maximum Z-axis travel distance from homing switch. Determines valid machine space for soft-limits and homing search distances.'
    }
];
