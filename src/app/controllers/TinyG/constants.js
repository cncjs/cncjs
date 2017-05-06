// g2core
export const G2CORE = 'g2core';

// TinyG
export const TINYG = 'TinyG';

// Tinyg Communications Programming
// https://github.com/synthetos/TinyG/wiki/Tinyg-Communications-Programming
export const TINYG_PLANNER_BUFFER_LOW_WATER_MARK = 5;
export const TINYG_PLANNER_BUFFER_HIGH_WATER_MARK = 7;

// TinyG has a 254 byte serial buffer that receives raw ASCII commands.
export const TINYG_SERIAL_BUFFER_LIMIT = 254;

// Machine State
// https://github.com/synthetos/g2/wiki/Status-Reports#stat-values
export const TINYG_MACHINE_STATE_INITIALIZING = 0; // Machine is initializing
export const TINYG_MACHINE_STATE_READY = 1; // Machine is ready for use
export const TINYG_MACHINE_STATE_ALARM = 2; // Machine is in alarm state
export const TINYG_MACHINE_STATE_STOP = 3; // Machine has encountered program stop
export const TINYG_MACHINE_STATE_END = 4; // Machine has encountered program end
export const TINYG_MACHINE_STATE_RUN = 5; // Machine is running
export const TINYG_MACHINE_STATE_HOLD = 6; // Machine is holding
export const TINYG_MACHINE_STATE_PROBE = 7; // Machine is in probing operation
export const TINYG_MACHINE_STATE_CYCLE = 8; // Reserved for canned cycles (not used)
export const TINYG_MACHINE_STATE_HOMING = 9; // Machine is in a homing cycle
export const TINYG_MACHINE_STATE_JOG = 10; // Machine is in a jogging cycle
export const TINYG_MACHINE_STATE_INTERLOCK = 11; // Machine is in safety interlock hold
export const TINYG_MACHINE_STATE_SHUTDOWN = 12; // Machine is in shutdown state. Will not process commands
export const TINYG_MACHINE_STATE_PANIC = 13; // Machine is in panic state. Needs to be physically reset

// Cycle State
export const TINYG_CYCLE_STATE_OFF = 0; // cycle off (not in cycle)
export const TINYG_CYCLE_STATE_NORMAL = 1; // normal machine state
export const TINYG_CYCLE_STATE_PROBE = 2; // probe cycle
export const TINYG_CYCLE_STATE_HOMING = 3; // homing cycle
export const TINYG_CYCLE_STATE_JOG = 4; // jog cycle

// Motion State
export const TINYG_MOTION_STATE_OFF = 0; // motion off
export const TINYG_MOTION_STATE_RUN = 1; // motion run
export const TINYG_MOTION_STATE_HOLD = 2; // motion hold

// Feedhold State
export const TINYG_FEEDHOLD_STATE_OFF = 0; // feedhold off (not in feedhold)
export const TINYG_FEEDHOLD_STATE_SYNC = 1; // feedhold sync phase
export const TINYG_FEEDHOLD_STATE_PLANNING = 2; // feedhold planning phase
export const TINYG_FEEDHOLD_STATE_DECELERATION = 3; // feedhold deceleration phase
export const TINYG_FEEDHOLD_STATE_HOLDING = 4; // feedhold holding
export const TINYG_FEEDHOLD_STATE_END = 5; // feedhold end hold

// G-code Motion Mode
export const TINYG_GCODE_MOTION_G0 = 0;
export const TINYG_GCODE_MOTION_G1 = 1;
export const TINYG_GCODE_MOTION_G2 = 2;
export const TINYG_GCODE_MOTION_G3 = 3;
export const TINYG_GCODE_MOTION_G80 = 4;

// G-code Coordinate System
export const TINYG_GCODE_COORDINATE_G53 = 0;
export const TINYG_GCODE_COORDINATE_G54 = 1;
export const TINYG_GCODE_COORDINATE_G55 = 2;
export const TINYG_GCODE_COORDINATE_G56 = 3;
export const TINYG_GCODE_COORDINATE_G57 = 4;
export const TINYG_GCODE_COORDINATE_G58 = 5;
export const TINYG_GCODE_COORDINATE_G59 = 6;

// G-code Plane Selection
export const TINYG_GCODE_PLANE_G17 = 0;
export const TINYG_GCODE_PLANE_G18 = 1;
export const TINYG_GCODE_PLANE_G19 = 2;

// G-code Units
export const TINYG_GCODE_UNITS_G20 = 0;
export const TINYG_GCODE_UNITS_G21 = 1;

// G-code Distance Mode
export const TINYG_GCODE_DISTANCE_G90 = 0;
export const TINYG_GCODE_DISTANCE_G91 = 1;

// G-code Feedrate Mode
export const TINYG_GCODE_FEEDRATE_G93 = 0;
export const TINYG_GCODE_FEEDRATE_G94 = 1;
export const TINYG_GCODE_FEEDRATE_G95 = 2;

// G-code Path Control Mode
export const TINYG_GCODE_PATH_G61 = 0;
export const TINYG_GCODE_PATH_G61_1 = 1;
export const TINYG_GCODE_PATH_G64 = 2;

// Status Codes
// https://github.com/synthetos/g2/wiki/Status-Codes
export const TINYG_STATUS_CODES = [
    {
        code: 0,
        msg: 'OK'
    },
    {
        code: 1,
        msg: 'Error'
    },
    {
        code: 2,
        msg: 'Eagain'
    },
    {
        code: 3,
        msg: 'No operation performed'
    },
    {
        code: 4,
        msg: 'Completed operation'
    },
    {
        code: 5,
        msg: 'System shutdown'
    },
    {
        code: 6,
        msg: 'System panic'
    },
    {
        code: 7,
        msg: 'End of line'
    },
    {
        code: 8,
        msg: 'End of file'
    },
    {
        code: 9,
        msg: 'File not open'
    },
    {
        code: 10,
        msg: 'Max file size exceeded'
    },
    {
        code: 11,
        msg: 'No such device'
    },
    {
        code: 12,
        msg: 'Buffer empty'
    },
    {
        code: 13,
        msg: 'Buffer full non-fatal'
    },
    {
        code: 14,
        msg: 'Buffer full FATAL'
    },
    {
        code: 15,
        msg: 'Initializing'
    },
    {
        code: 16,
        msg: 'Entering boot loader'
    },
    {
        code: 17,
        msg: 'Function is stubbed'
    },
    {
        code: 18,
        msg: 'System alarm'
    },
    {
        code: 19,
        msg: '19'
    },
    {
        code: 20,
        msg: 'Internal error'
    },
    {
        code: 21,
        msg: 'Internal range error'
    },
    {
        code: 22,
        msg: 'Floating point error'
    },
    {
        code: 23,
        msg: 'Divide by zero'
    },
    {
        code: 24,
        msg: 'Invalid Address'
    },
    {
        code: 25,
        msg: 'Read-only address'
    },
    {
        code: 26,
        msg: 'Initialization failure'
    },
    {
        code: 27,
        msg: '27'
    },
    {
        code: 28,
        msg: 'Failed to get planner buffer'
    },
    {
        code: 29,
        msg: 'Generic exception report'
    },
    {
        code: 30,
        msg: 'Move time is infinite'
    },
    {
        code: 31,
        msg: 'Move time is NAN'
    },
    {
        code: 32,
        msg: 'Float is infinite'
    },
    {
        code: 33,
        msg: 'Float is NAN'
    },
    {
        code: 34,
        msg: 'Persistence error'
    },
    {
        code: 35,
        msg: 'Bad status report setting'
    },
    {
        code: 36,
        msg: 'Failed to get planner buffer'
    },
    {
        code: 37,
        msg: 'Backplan hit running buffer'
    },
    {
        code: 38,
        msg: '38'
    },
    {
        code: 39,
        msg: '39'
    },
    {
        code: 40,
        msg: '40'
    },
    {
        code: 41,
        msg: '41'
    },
    {
        code: 42,
        msg: '42'
    },
    {
        code: 43,
        msg: '43'
    },
    {
        code: 44,
        msg: '44'
    },
    {
        code: 45,
        msg: '45'
    },
    {
        code: 46,
        msg: '46'
    },
    {
        code: 47,
        msg: '47'
    },
    {
        code: 48,
        msg: '48'
    },
    {
        code: 49,
        msg: '49'
    },
    {
        code: 50,
        msg: '50'
    },
    {
        code: 51,
        msg: '51'
    },
    {
        code: 52,
        msg: '52'
    },
    {
        code: 53,
        msg: '53'
    },
    {
        code: 54,
        msg: '54'
    },
    {
        code: 55,
        msg: '55'
    },
    {
        code: 56,
        msg: '56'
    },
    {
        code: 57,
        msg: '57'
    },
    {
        code: 58,
        msg: '58'
    },
    {
        code: 59,
        msg: '59'
    },
    {
        code: 60,
        msg: '60'
    },
    {
        code: 61,
        msg: '61'
    },
    {
        code: 62,
        msg: '62'
    },
    {
        code: 63,
        msg: '63'
    },
    {
        code: 64,
        msg: '64'
    },
    {
        code: 65,
        msg: '65'
    },
    {
        code: 66,
        msg: '66'
    },
    {
        code: 67,
        msg: '67'
    },
    {
        code: 68,
        msg: '68'
    },
    {
        code: 69,
        msg: '69'
    },
    {
        code: 70,
        msg: '70'
    },
    {
        code: 71,
        msg: '71'
    },
    {
        code: 72,
        msg: '72'
    },
    {
        code: 73,
        msg: '73'
    },
    {
        code: 74,
        msg: '74'
    },
    {
        code: 75,
        msg: '75'
    },
    {
        code: 76,
        msg: '76'
    },
    {
        code: 77,
        msg: '77'
    },
    {
        code: 78,
        msg: '78'
    },
    {
        code: 79,
        msg: '79'
    },
    {
        code: 80,
        msg: '80'
    },
    {
        code: 81,
        msg: '81'
    },
    {
        code: 82,
        msg: '82'
    },
    {
        code: 83,
        msg: '83'
    },
    {
        code: 84,
        msg: '84'
    },
    {
        code: 85,
        msg: '85'
    },
    {
        code: 86,
        msg: '86'
    },
    {
        code: 87,
        msg: '87'
    },
    {
        code: 88,
        msg: 'Buffer free assertion failure'
    },
    {
        code: 89,
        msg: 'State management assertion failure'
    },
    {
        code: 90,
        msg: 'Config assertion failure'
    },
    {
        code: 91,
        msg: 'XIO assertion failure'
    },
    {
        code: 92,
        msg: 'Encoder assertion failure'
    },
    {
        code: 93,
        msg: 'Stepper assertion failure'
    },
    {
        code: 94,
        msg: 'Planner assertion failure'
    },
    {
        code: 95,
        msg: 'Canonical machine assertion failure'
    },
    {
        code: 96,
        msg: 'Controller assertion failure'
    },
    {
        code: 97,
        msg: 'Stack overflow detected'
    },
    {
        code: 98,
        msg: 'Memory fault detected'
    },
    {
        code: 99,
        msg: 'Generic assertion failure'
    },
    {
        code: 100,
        msg: 'Unrecognized command or config name'
    },
    {
        code: 101,
        msg: 'Invalid or malformed command'
    },
    {
        code: 102,
        msg: 'Bad number format'
    },
    {
        code: 103,
        msg: 'Unsupported number or JSON type'
    },
    {
        code: 104,
        msg: 'Parameter is read-only'
    },
    {
        code: 105,
        msg: 'Parameter cannot be read'
    },
    {
        code: 106,
        msg: 'Command not accepted'
    },
    {
        code: 107,
        msg: 'Input exceeds max length'
    },
    {
        code: 108,
        msg: 'Input less than minimum value'
    },
    {
        code: 109,
        msg: 'Input exceeds maximum value'
    },
    {
        code: 110,
        msg: 'Input value range error'
    },
    {
        code: 111,
        msg: 'JSON syntax error'
    },
    {
        code: 112,
        msg: 'JSON has too many pairs'
    },
    {
        code: 113,
        msg: 'JSON string too long'
    },
    {
        code: 114,
        msg: 'JSON txt fields cannot be nested'
    },
    {
        code: 115,
        msg: 'JSON maximum nesting depth exceeded'
    },
    {
        code: 116,
        msg: 'JSON value does not agree with variable type'
    },
    {
        code: 117,
        msg: '117'
    },
    {
        code: 118,
        msg: '118'
    },
    {
        code: 119,
        msg: '119'
    },
    {
        code: 120,
        msg: '120'
    },
    {
        code: 121,
        msg: '121'
    },
    {
        code: 122,
        msg: '122'
    },
    {
        code: 123,
        msg: '123'
    },
    {
        code: 124,
        msg: '124'
    },
    {
        code: 125,
        msg: '125'
    },
    {
        code: 126,
        msg: '126'
    },
    {
        code: 127,
        msg: '127'
    },
    {
        code: 128,
        msg: '128'
    },
    {
        code: 129,
        msg: '129'
    },
    {
        code: 130,
        msg: 'Generic Gcode input error'
    },
    {
        code: 131,
        msg: 'Gcode command unsupported'
    },
    {
        code: 132,
        msg: 'M code unsupported'
    },
    {
        code: 133,
        msg: 'Gcode modal group violation'
    },
    {
        code: 134,
        msg: 'Axis word missing'
    },
    {
        code: 135,
        msg: 'Axis cannot be present'
    },
    {
        code: 136,
        msg: 'Axis invalid for this command'
    },
    {
        code: 137,
        msg: 'Axis disabled'
    },
    {
        code: 138,
        msg: 'Axis target position missing'
    },
    {
        code: 139,
        msg: 'Axis target position invalid'
    },
    {
        code: 140,
        msg: 'Selected plane missing'
    },
    {
        code: 141,
        msg: 'Selected plane invalid'
    },
    {
        code: 142,
        msg: 'Feedrate not specified'
    },
    {
        code: 143,
        msg: 'Inverse time mode cannot be used with this command'
    },
    {
        code: 144,
        msg: 'Rotary axes cannot be used with this command'
    },
    {
        code: 145,
        msg: 'G0 or G1 must be active for G53'
    },
    {
        code: 146,
        msg: 'Requested velocity exceeds limits'
    },
    {
        code: 147,
        msg: 'Cutter compensation cannot be enabled'
    },
    {
        code: 148,
        msg: 'Programmed point same as current point'
    },
    {
        code: 149,
        msg: 'Spindle speed below minimum'
    },
    {
        code: 150,
        msg: 'Spindle speed exceeded maximum'
    },
    {
        code: 151,
        msg: 'Spindle must be off for this command'
    },
    {
        code: 152,
        msg: 'Spindle must be turning for this command'
    },
    {
        code: 153,
        msg: '153'
    },
    {
        code: 154,
        msg: 'Arc specification error - impossible center point'
    },
    {
        code: 155,
        msg: 'Arc specification error'
    },
    {
        code: 156,
        msg: 'Arc specification error - missing axis(es)'
    },
    {
        code: 157,
        msg: 'Arc specification error - missing offset(s)'
    },
    {
        code: 158,
        msg: 'Arc specification error - radius arc out of tolerance'
    },
    {
        code: 159,
        msg: 'Arc specification error - endpoint is starting point'
    },
    {
        code: 160,
        msg: 'P word missing'
    },
    {
        code: 161,
        msg: 'P word invalid'
    },
    {
        code: 162,
        msg: 'P word zero'
    },
    {
        code: 163,
        msg: 'P word negative'
    },
    {
        code: 164,
        msg: 'P word not an integer'
    },
    {
        code: 165,
        msg: 'P word not a valid tool number'
    },
    {
        code: 166,
        msg: 'D word missing'
    },
    {
        code: 167,
        msg: 'D word invalid'
    },
    {
        code: 168,
        msg: 'E word missing'
    },
    {
        code: 169,
        msg: 'E word invalid'
    },
    {
        code: 170,
        msg: 'H word missing'
    },
    {
        code: 171,
        msg: 'H word invalid'
    },
    {
        code: 172,
        msg: 'L word missing'
    },
    {
        code: 173,
        msg: 'L word invalid'
    },
    {
        code: 174,
        msg: 'Q word missing'
    },
    {
        code: 175,
        msg: 'Q word invalid'
    },
    {
        code: 176,
        msg: 'R word missing'
    },
    {
        code: 177,
        msg: 'R word invalid'
    },
    {
        code: 178,
        msg: 'S word missing'
    },
    {
        code: 179,
        msg: 'S word invalid'
    },
    {
        code: 180,
        msg: 'T word missing'
    },
    {
        code: 181,
        msg: 'T word invalid'
    },
    {
        code: 182,
        msg: '182'
    },
    {
        code: 183,
        msg: '183'
    },
    {
        code: 184,
        msg: '184'
    },
    {
        code: 185,
        msg: '185'
    },
    {
        code: 186,
        msg: '186'
    },
    {
        code: 187,
        msg: '187'
    },
    {
        code: 188,
        msg: '188'
    },
    {
        code: 189,
        msg: '189'
    },
    {
        code: 190,
        msg: '190'
    },
    {
        code: 191,
        msg: '191'
    },
    {
        code: 192,
        msg: '192'
    },
    {
        code: 193,
        msg: '193'
    },
    {
        code: 194,
        msg: '194'
    },
    {
        code: 195,
        msg: '195'
    },
    {
        code: 196,
        msg: '196'
    },
    {
        code: 197,
        msg: '197'
    },
    {
        code: 198,
        msg: '198'
    },
    {
        code: 199,
        msg: '199'
    },
    {
        code: 200,
        msg: 'Generic error'
    },
    {
        code: 201,
        msg: 'Move < min length'
    },
    {
        code: 202,
        msg: 'Move < min time'
    },
    {
        code: 203,
        msg: 'Limit hit [$clear to reset, $lim=0 to override]'
    },
    {
        code: 204,
        msg: 'Command rejected by ALARM [$clear to reset]'
    },
    {
        code: 205,
        msg: 'Command rejected by SHUTDOWN [$clear to reset]'
    },
    {
        code: 206,
        msg: 'Command rejected by PANIC [^x to reset]'
    },
    {
        code: 207,
        msg: 'Kill job'
    },
    {
        code: 208,
        msg: 'No GPIO for this value'
    },
    {
        code: 209,
        msg: '209'
    },
    {
        code: 210,
        msg: '210'
    },
    {
        code: 211,
        msg: '211'
    },
    {
        code: 212,
        msg: '212'
    },
    {
        code: 213,
        msg: '213'
    },
    {
        code: 214,
        msg: '214'
    },
    {
        code: 215,
        msg: '215'
    },
    {
        code: 216,
        msg: '216'
    },
    {
        code: 217,
        msg: '217'
    },
    {
        code: 218,
        msg: '218'
    },
    {
        code: 219,
        msg: '219'
    },
    {
        code: 220,
        msg: 'Soft limit'
    },
    {
        code: 221,
        msg: 'Soft limit - X min'
    },
    {
        code: 222,
        msg: 'Soft limit - X max'
    },
    {
        code: 223,
        msg: 'Soft limit - Y min'
    },
    {
        code: 224,
        msg: 'Soft limit - Y max'
    },
    {
        code: 225,
        msg: 'Soft limit - Z min'
    },
    {
        code: 226,
        msg: 'Soft limit - Z max'
    },
    {
        code: 227,
        msg: 'Soft limit - A min'
    },
    {
        code: 228,
        msg: 'Soft limit - A max'
    },
    {
        code: 229,
        msg: 'Soft limit - B min'
    },
    {
        code: 230,
        msg: 'Soft limit - B max'
    },
    {
        code: 231,
        msg: 'Soft limit - C min'
    },
    {
        code: 232,
        msg: 'Soft limit - C max'
    },
    {
        code: 233,
        msg: 'Soft limit during arc'
    },
    {
        code: 234,
        msg: '234'
    },
    {
        code: 235,
        msg: '235'
    },
    {
        code: 236,
        msg: '236'
    },
    {
        code: 237,
        msg: '237'
    },
    {
        code: 238,
        msg: '238'
    },
    {
        code: 239,
        msg: '239'
    },
    {
        code: 240,
        msg: 'Homing cycle failed'
    },
    {
        code: 241,
        msg: 'Homing Err - Bad or no axis specified'
    },
    {
        code: 242,
        msg: 'Homing Err - Search velocity is zero'
    },
    {
        code: 243,
        msg: 'Homing Err - Latch velocity is zero'
    },
    {
        code: 244,
        msg: 'Homing Err - Travel min & max are the same'
    },
    {
        code: 245,
        msg: '245'
    },
    {
        code: 246,
        msg: 'Homing Err - Homing input is misconfigured'
    },
    {
        code: 247,
        msg: 'Homing Err - Must clear switches before homing'
    },
    {
        code: 248,
        msg: '248'
    },
    {
        code: 249,
        msg: '249'
    },
    {
        code: 250,
        msg: 'Probe cycle failed'
    },
    {
        code: 251,
        msg: 'Probe travel is too small'
    },
    {
        code: 252,
        msg: 'No probe switch configured'
    },
    {
        code: 253,
        msg: 'Multiple probe switches configured'
    },
    {
        code: 254,
        msg: 'Probe switch configured on ABC axis'
    },
    {
        code: 255,
        msg: '255'
    }
];
