export const IMPERIAL_UNIT = 'inch';
export const METRIC_UNIT = 'mm';

// mm/min (or inch/min)
export const FEEDRATE_MIN = 0;
export const FEEDRATE_MAX = 1000;
export const FEEDRATE_STEP = 10;
export const FEEDRATE_DEFAULT = 250;

// mm (or inch)
export const DISTANCE_MIN = 0;
export const DISTANCE_MAX = 1000;
export const DISTANCE_STEP = 0.1;
export const DISTANCE_DEFAULT = 1.00;

// Grbl Active State
export const ACTIVE_STATE_IDLE = 'Idle';
export const ACTIVE_STATE_RUN = 'Run';
export const ACTIVE_STATE_HOLD = 'Hold';
export const ACTIVE_STATE_DOOR = 'Door';
export const ACTIVE_STATE_HOME = 'Home';
export const ACTIVE_STATE_ALARM = 'Alarm';
export const ACTIVE_STATE_CHECK = 'Check';