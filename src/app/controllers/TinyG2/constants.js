// TinyG2
export const TINYG2 = 'TinyG2';

// https://github.com/synthetos/TinyG/wiki/Tinyg-Communications-Programming
// An optimal way to feed the system is to have about 20 to 24 moves in the planner buffer at all times once movement has started. Note that the planner queue actually has 28 buffers, but the controller will not process a command from the serial buffer unless at least 4 buffers are free, so the effective max queue depth is actually 24, not 28.
export const TINYG2_PLANNER_BUFFER_POOL_SIZE = 28;
export const TINYG2_PLANNER_BUFFER_LOW_WATER_MARK = 8; // 28 (buffers) - 20 (moves) = 8
export const TINYG2_PLANNER_QUEUE_STATUS_READY = 0;
export const TINYG2_PLANNER_QUEUE_STATUS_RUNNING = 1;
export const TINYG2_PLANNER_QUEUE_STATUS_BLOCKED = 2;

// Machine State
// https://github.com/synthetos/TinyG/wiki/TinyG-Status-Codes#status-report-enumerations
export const TINYG2_MACHINE_STATE_INIT = 0; // machine is initializing
export const TINYG2_MACHINE_STATE_READY = 1; // machine is ready for use
export const TINYG2_MACHINE_STATE_ALARM = 2; // machine is in alarm state (soft shut down)
export const TINYG2_MACHINE_STATE_STOP = 3; // program stop or no more blocks (M0, M1, M60)
export const TINYG2_MACHINE_STATE_END = 4; // program end via M2, M30
export const TINYG2_MACHINE_STATE_RUN = 5; // motion is running
export const TINYG2_MACHINE_STATE_HOLD = 6; // motion is holding
export const TINYG2_MACHINE_STATE_PROBE = 7; // probe cycle active
export const TINYG2_MACHINE_STATE_CYCLING = 8; // machine is running (cycling)
export const TINYG2_MACHINE_STATE_HOMING = 9; // machine is homing
export const TINYG2_MACHINE_STATE_JOGGING = 10; // machine is jogging
export const TINYG2_MACHINE_STATE_SHUTDOWN = 11; // machine is in hard alarm state (shut down)

// Cycle State
export const TINYG2_CYCLE_STATE_OFF = 0; // cycle off (not in cycle)
export const TINYG2_CYCLE_STATE_NORMAL = 1; // normal machine state
export const TINYG2_CYCLE_STATE_PROBE = 2; // probe cycle
export const TINYG2_CYCLE_STATE_HOMING = 3; // homing cycle
export const TINYG2_CYCLE_STATE_JOG = 4; // jog cycle

// Motion State
export const TINYG2_MOTION_STATE_OFF = 0; // motion off
export const TINYG2_MOTION_STATE_RUN = 1; // motion run
export const TINYG2_MOTION_STATE_HOLD = 2; // motion hold

// Feedhold State
export const TINYG2_FEEDHOLD_STATE_OFF = 0; // feedhold off (not in feedhold)
export const TINYG2_FEEDHOLD_STATE_SYNC = 1; // feedhold sync phase
export const TINYG2_FEEDHOLD_STATE_PLANNING = 2; // feedhold planning phase
export const TINYG2_FEEDHOLD_STATE_DECELERATION = 3; // feedhold deceleration phase
export const TINYG2_FEEDHOLD_STATE_HOLDING = 4; // feedhold holding
export const TINYG2_FEEDHOLD_STATE_END = 5; // feedhold end hold

// G-code Motion Mode
export const TINYG2_GCODE_MOTION_G0 = 0;
export const TINYG2_GCODE_MOTION_G1 = 1;
export const TINYG2_GCODE_MOTION_G2 = 2;
export const TINYG2_GCODE_MOTION_G3 = 3;
export const TINYG2_GCODE_MOTION_G80 = 4;

// G-code Coordinate System
export const TINYG2_GCODE_COORDINATE_G53 = 0;
export const TINYG2_GCODE_COORDINATE_G54 = 1;
export const TINYG2_GCODE_COORDINATE_G55 = 2;
export const TINYG2_GCODE_COORDINATE_G56 = 3;
export const TINYG2_GCODE_COORDINATE_G57 = 4;
export const TINYG2_GCODE_COORDINATE_G58 = 5;
export const TINYG2_GCODE_COORDINATE_G59 = 6;

// G-code Plane Selection
export const TINYG2_GCODE_PLANE_G17 = 0;
export const TINYG2_GCODE_PLANE_G18 = 1;
export const TINYG2_GCODE_PLANE_G19 = 2;

// G-code Units
export const TINYG2_GCODE_UNITS_G20 = 0;
export const TINYG2_GCODE_UNITS_G21 = 1;

// G-code Distance Mode
export const TINYG2_GCODE_DISTANCE_G90 = 0;
export const TINYG2_GCODE_DISTANCE_G91 = 1;

// G-code Feedrate Mode
export const TINYG2_GCODE_FEEDRATE_G93 = 0;
export const TINYG2_GCODE_FEEDRATE_G94 = 1;
export const TINYG2_GCODE_FEEDRATE_G95 = 2;

// G-code Path Control Mode
export const TINYG2_GCODE_PATH_G61 = 0;
export const TINYG2_GCODE_PATH_G61_1 = 1;
export const TINYG2_GCODE_PATH_G64 = 2;
