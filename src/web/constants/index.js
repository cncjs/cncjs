// Metric and Imperial units
export const IMPERIAL_UNITS = 'in';
export const METRIC_UNITS = 'mm';

// Controller
export const GRBL = 'Grbl';
export const TINYG2 = 'TinyG2';

// G-code Workflow State
export const WORKFLOW_STATE_RUNNING = 'running';
export const WORKFLOW_STATE_PAUSED = 'paused';
export const WORKFLOW_STATE_IDLE = 'idle';

// Grbl Active State
export const GRBL_ACTIVE_STATE_IDLE = 'Idle';
export const GRBL_ACTIVE_STATE_RUN = 'Run';
export const GRBL_ACTIVE_STATE_HOLD = 'Hold';
export const GRBL_ACTIVE_STATE_DOOR = 'Door';
export const GRBL_ACTIVE_STATE_HOME = 'Home';
export const GRBL_ACTIVE_STATE_SLEEP = 'Sleep';
export const GRBL_ACTIVE_STATE_ALARM = 'Alarm';
export const GRBL_ACTIVE_STATE_CHECK = 'Check';

// TinyG2 Machine State
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
