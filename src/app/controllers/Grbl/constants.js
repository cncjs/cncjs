// Grbl
export const GRBL = 'Grbl';

// Active State
export const GRBL_ACTIVE_STATE_IDLE = 'Idle';
export const GRBL_ACTIVE_STATE_RUN = 'Run';
export const GRBL_ACTIVE_STATE_HOLD = 'Hold';
export const GRBL_ACTIVE_STATE_DOOR = 'Door';
export const GRBL_ACTIVE_STATE_HOME = 'Home';
export const GRBL_ACTIVE_STATE_SLEEP = 'Sleep';
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
        description: 'Expected command letter',
        help: 'G-code words consist of a letter and a value. Letter was not found.'
    },
    {
        code: 2,
        description: 'Bad number format',
        help: 'Missing the expected G-code word value or numeric value format is not valid.'
    },
    {
        code: 3,
        description: 'Invalid statement',
        help: 'Grbl \$\' system command was not recognized or supported.'
    },
    {
        code: 4,
        description: 'Value < 0',
        help: 'Negative value received for an expected positive value.'
    },
    {
        code: 5,
        description: 'Setting disabled',
        help: 'Homing cycle failure. Homing is not enabled via settings.'
    },
    {
        code: 6,
        description: 'Value < 3 usec',
        help: 'Minimum step pulse time must be greater than 3usec.'
    },
    {
        code: 7,
        description: 'EEPROM read fail. Using defaults',
        help: 'An EEPROM read failed. Auto-restoring affected EEPROM to default values.'
    },
    {
        code: 8,
        description: 'Not idle',
        help: 'Grbl \'$\' command cannot be used unless Grbl is IDLE. Ensures smooth operation during a job.'
    },
    {
        code: 9,
        description: 'G-code lock',
        help: 'G-code commands are locked out during alarm or jog state.'
    },
    {
        code: 10,
        description: 'Homing not enabled',
        help: 'Soft limits cannot be enabled without homing also enabled.'
    },
    {
        code: 11,
        description: 'Line overflow',
        help: 'Max characters per line exceeded. Received command line was not executed.'
    },
    {
        code: 12,
        description: 'Step rate > 30kHz',
        help: 'Grbl \'$\' setting value cause the step rate to exceed the maximum supported.'
    },
    {
        code: 13,
        description: 'Check Door',
        help: 'Safety door detected as opened and door state initiated.'
    },
    {
        code: 14,
        description: 'Line length exceeded',
        help: 'Build info or startup line exceeded EEPROM line length limit. Line not stored.'
    },
    {
        code: 15,
        description: 'Travel exceeded',
        help: 'Jog target exceeds machine travel. Jog command has been ignored.'
    },
    {
        code: 16,
        description: 'Invalid jog command',
        help: 'Jog command has no \'=\' or contains prohibited g-code.'
    },
    {
        code: 20,
        description: 'Unsupported command',
        help: 'Unsupported or invalid g-code command found in block.'
    },
    {
        code: 21,
        description: 'Modal group violation',
        help: 'More than one g-code command from same modal group found in block.'
    },
    {
        code: 22,
        description: 'Undefined feed rate',
        help: 'Feed rate has not yet been set or is undefined.'
    },
    {
        code: 23,
        description: 'Invalid gcode ID:23',
        help: 'G-code command in block requires an integer value.'
    },
    {
        code: 24,
        description: 'Invalid gcode ID:24',
        help: 'More than one g-code command that requires axis words found in block.'
    },
    {
        code: 25,
        description: 'Invalid gcode ID:25',
        help: 'Repeated g-code word found in block.'
    },
    {
        code: 26,
        description: 'Invalid gcode ID:26',
        help: 'No axis words found in block for g-code command or current modal state which requires them.'
    },
    {
        code: 27,
        description: 'Invalid gcode ID:27',
        help: 'Line number value is invalid.'
    },
    {
        code: 28,
        description: 'Invalid gcode ID:28',
        help: 'G-code command is missing a required value word.'
    },
    {
        code: 29,
        description: 'Invalid gcode ID:29',
        help: 'G59.x work coordinate systems are not supported.'
    },
    {
        code: 30,
        description: 'Invalid gcode ID:30',
        help: 'G53 only allowed with G0 and G1 motion modes.'
    },
    {
        code: 31,
        description: 'Invalid gcode ID:31',
        help: 'Axis words found in block when no command or current modal state uses them.'
    },
    {
        code: 32,
        description: 'Invalid gcode ID:32',
        help: 'G2 and G3 arcs require at least one in-plane axis word.'
    },
    {
        code: 33,
        description: 'Invalid gcode ID:33',
        help: 'Motion command target is invalid.'
    },
    {
        code: 34,
        description: 'Invalid gcode ID:34',
        help: 'Arc radius value is invalid.'
    },
    {
        code: 35,
        description: 'Invalid gcode ID:35',
        help: 'G2 and G3 arcs require at least one in-plane offset word.'
    },
    {
        code: 36,
        description: 'Invalid gcode ID:36',
        help: 'Unused value words found in block.'
    },
    {
        code: 37,
        description: 'Invalid gcode ID:37',
        help: 'G43.1 dynamic tool length offset is not assigned to configured tool length axis.'
    }
];

// Alarms
// https://github.com/gnea/grbl-Mega/blob/edge/doc/csv/alarm_codes_en_US.csv
export const GRBL_ALARMS = [
    {
        code: 1,
        description: 'Hard limit',
        help: 'Hard limit has been triggered. Machine position is likely lost due to sudden halt. Re-homing is highly recommended.'
    },
    {
        code: 2,
        description: 'Soft limit',
        help: 'Soft limit alarm. G-code motion target exceeds machine travel. Machine position retained. Alarm may be safely unlocked.'
    },
    {
        code: 3,
        description: 'Abort during cycle',
        help: 'Reset while in motion. Machine position is likely lost due to sudden halt. Re-homing is highly recommended.'
    },
    {
        code: 4,
        description: 'Probe fail',
        help: 'Probe fail. Probe is not in the expected initial state before starting probe cycle when G38.2 and G38.3 is not triggered and G38.4 and G38.5 is triggered.'
    },
    {
        code: 5,
        description: 'Probe fail',
        help: 'Probe fail. Probe did not contact the workpiece within the programmed travel for G38.2 and G38.4.'
    },
    {
        code: 6,
        description: 'Homing fail',
        help: 'Homing fail. The active homing cycle was reset.'
    },
    {
        code: 7,
        description: 'Homing fail',
        help: 'Homing fail. Safety door was opened during homing cycle.'
    },
    {
        code: 8,
        description: 'Homing fail',
        help: 'Homing fail. Pull off travel failed to clear limit switch. Try increasing pull-off setting or check wiring.'
    },
    {
        code: 9,
        description: 'Homing fail',
        help: 'Homing fail. Could not find limit switch within search distances. Try increasing max travel, decreasing pull-off distance, or check wiring.'
    }
];

// Settings
// https://github.com/gnea/grbl-Mega/blob/edge/doc/csv/setting_codes_en_US.csv
export const GRBL_SETTINGS = [
    {
        setting: '$0',
        description: 'Step pulse time',
        units: 'microseconds',
        help: 'Sets time length per step. Minimum 3usec.'
    },
    {
        setting: '$1',
        description: 'Step idle delay',
        units: 'milliseconds',
        help: 'Sets a short hold delay when stopping to let dynamics settle before disabling steppers. Value 255 keeps motors enabled with no delay.'
    },
    {
        setting: '$2',
        description: 'Step pulse invert',
        units: 'mask',
        help: 'Inverts the step signal. Set axis bit to invert (00000ZYX).'
    },
    {
        setting: '$3',
        description: 'Step direction invert',
        units: 'mask',
        help: 'Inverts the direction signal. Set axis bit to invert (00000ZYX).'
    },
    {
        setting: '$4',
        description: 'Invert step enable pin',
        units: 'boolean',
        help: 'Inverts the stepper driver enable pin signal.'
    },
    {
        setting: '$5',
        description: 'Invert limit pins',
        units: 'boolean',
        help: 'Inverts the all of the limit input pins.'
    },
    {
        setting: '$6',
        description: 'Invert probe pin',
        units: 'boolean',
        help: 'Inverts the probe input pin signal.'
    },
    {
        setting: '$10',
        description: 'Status report options',
        units: 'mask',
        help: 'Alters data included in status reports.'
    },
    {
        setting: '$11',
        description: 'Junction deviation',
        units: 'millimeters',
        help: 'Sets how fast Grbl travels through consecutive motions. Lower value slows it down.'
    },
    {
        setting: '$12',
        description: 'Arc tolerance',
        units: 'millimeters',
        help: 'Sets the G2 and G3 arc tracing accuracy based on radial error. Beware: A very small value may effect performance.'
    },
    {
        setting: '$13',
        description: 'Report in inches',
        units: 'boolean',
        help: 'Enables inch units when returning any position and rate value that is not a settings value.'
    },
    {
        setting: '$20',
        description: 'Soft limits enable',
        units: 'boolean',
        help: 'Enables soft limits checks within machine travel and sets alarm when exceeded. Requires homing.'
    },
    {
        setting: '$21',
        description: 'Hard limits enable',
        units: 'boolean',
        help: 'Enables hard limits. Immediately halts motion and throws an alarm when switch is triggered.'
    },
    {
        setting: '$22',
        description: 'Homing cycle enable',
        units: 'boolean',
        help: 'Enables homing cycle. Requires limit switches on all axes.'
    },
    {
        setting: '$23',
        description: 'Homing direction invert',
        units: 'mask',
        help: 'Homing searches for a switch in the positive direction. Set axis bit (00000ZYX) to search in negative direction.'
    },
    {
        setting: '$24',
        description: 'Homing locate feed rate',
        units: 'mm/min',
        help: 'Feed rate to slowly engage limit switch to determine its location accurately.'
    },
    {
        setting: '$25',
        description: 'Homing search seek rate',
        units: 'mm/min',
        help: 'Seek rate to quickly find the limit switch before the slower locating phase.'
    },
    {
        setting: '$26',
        description: 'Homing switch debounce delay',
        units: 'milliseconds',
        help: 'Sets a short delay between phases of homing cycle to let a switch debounce.'
    },
    {
        setting: '$27',
        description: 'Homing switch pull-off distance',
        units: 'millimeters',
        help: 'Retract distance after triggering switch to disengage it. Homing will fail if switch isn\'t cleared.'
    },
    {
        setting: '$30',
        description: 'Maximum spindle speed',
        units: 'RPM',
        help: 'Maximum spindle speed. Sets PWM to 100% duty cycle.'
    },
    {
        setting: '$31',
        description: 'Minimum spindle speed',
        units: 'RPM',
        help: 'Minimum spindle speed. Sets PWM to 0.4% or lowest duty cycle.'
    },
    {
        setting: '$32',
        description: 'Laser-mode enable',
        units: 'boolean',
        help: 'Enables laser mode. Consecutive G1/2/3 commands will not halt when spindle speed is changed.'
    },
    {
        setting: '$100',
        description: 'X-axis travel resolution',
        units: 'step/mm',
        help: 'X-axis travel resolution in steps per millimeter.'
    },
    {
        setting: '$101',
        description: 'Y-axis travel resolution',
        units: 'step/mm',
        help: 'Y-axis travel resolution in steps per millimeter.'
    },
    {
        setting: '$102',
        description: 'Z-axis travel resolution',
        units: 'step/mm',
        help: 'Z-axis travel resolution in steps per millimeter.'
    },
    {
        setting: '$110',
        description: 'X-axis maximum rate',
        units: 'mm/min',
        help: 'X-axis maximum rate. Used as G0 rapid rate.'
    },
    {
        setting: '$111',
        description: 'Y-axis maximum rate',
        units: 'mm/min',
        help: 'Y-axis maximum rate. Used as G0 rapid rate.'
    },
    {
        setting: '$112',
        description: 'Z-axis maximum rate',
        units: 'mm/min',
        help: 'Z-axis maximum rate. Used as G0 rapid rate.'
    },
    {
        setting: '$120',
        description: 'X-axis acceleration',
        units: 'mm/sec^2',
        help: 'X-axis acceleration. Used for motion planning to not exceed motor torque and lose steps.'
    },
    {
        setting: '$121',
        description: 'Y-axis acceleration',
        units: 'mm/sec^2',
        help: 'Y-axis acceleration. Used for motion planning to not exceed motor torque and lose steps.'
    },
    {
        setting: '$122',
        description: 'Z-axis acceleration',
        units: 'mm/sec^2',
        help: 'Z-axis acceleration. Used for motion planning to not exceed motor torque and lose steps.'
    },
    {
        setting: '$130',
        description: 'X-axis maximum travel',
        units: 'millimeters',
        help: 'Maximum X-axis travel distance from homing switch. Determines valid machine space for soft-limits and homing search distances.'
    },
    {
        setting: '$131',
        description: 'Y-axis maximum travel',
        units: 'millimeters',
        help: 'Maximum Y-axis travel distance from homing switch. Determines valid machine space for soft-limits and homing search distances.'
    },
    {
        setting: '$132',
        description: 'Z-axis maximum travel',
        units: 'millimeters',
        help: 'Maximum Z-axis travel distance from homing switch. Determines valid machine space for soft-limits and homing search distances.'
    }
];
