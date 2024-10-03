// Controller Command
export const CONTROLLER_COMMAND_SENDER_LOAD = 'sender_load';
export const CONTROLLER_COMMAND_SENDER_UNLOAD = 'sender_unload';
export const CONTROLLER_COMMAND_SENDER_START = 'sender_start';
export const CONTROLLER_COMMAND_SENDER_STOP = 'sender_stop';
export const CONTROLLER_COMMAND_SENDER_PAUSE = 'sender_pause';
export const CONTROLLER_COMMAND_SENDER_RESUME = 'sender_resume';
export const CONTROLLER_COMMAND_FEEDER_START = 'feeder_start';
export const CONTROLLER_COMMAND_FEEDER_STOP = 'feeder_stop';
export const CONTROLLER_COMMAND_GCODE = 'gcode';
export const CONTROLLER_COMMAND_FEED_HOLD = 'feed_hold';
export const CONTROLLER_COMMAND_CYCLE_START = 'cycle_start';
export const CONTROLLER_COMMAND_HOMING = 'homing';
export const CONTROLLER_COMMAND_SLEEP = 'sleep';
export const CONTROLLER_COMMAND_UNLOCK = 'unlock';
export const CONTROLLER_COMMAND_RESET = 'reset';
export const CONTROLLER_COMMAND_JOG_CANCEL = 'jog_cancel';
export const CONTROLLER_COMMAND_FEED_OVERRIDE = 'feed_override';
export const CONTROLLER_COMMAND_RAPID_OVERRIDE = 'rapid_override';
export const CONTROLLER_COMMAND_SPINDLE_OVERRIDE = 'spindle_override';
export const CONTROLLER_COMMAND_LASER_TEST = 'laser_test';
export const CONTROLLER_COMMAND_MACRO_LOAD = 'macro_load';
export const CONTROLLER_COMMAND_MACRO_RUN = 'macro_run';
export const CONTROLLER_COMMAND_WATCHDIR_LOAD = 'watchdir_load';

// Controller Event Trigger
export const CONTROLLER_EVENT_TRIGGER_CONTROLLER_READY = 'controller_ready';
export const CONTROLLER_EVENT_TRIGGER_SENDER_LOAD = 'sender_load';
export const CONTROLLER_EVENT_TRIGGER_SENDER_UNLOAD = 'sender_unload';
export const CONTROLLER_EVENT_TRIGGER_SENDER_START = 'sender_start';
export const CONTROLLER_EVENT_TRIGGER_SENDER_STOP = 'sender_stop';
export const CONTROLLER_EVENT_TRIGGER_SENDER_PAUSE = 'sender_pause';
export const CONTROLLER_EVENT_TRIGGER_SENDER_RESUME = 'sender_resume';
export const CONTROLLER_EVENT_TRIGGER_FEED_HOLD = 'feed_hold';
export const CONTROLLER_EVENT_TRIGGER_CYCLE_START = 'cycle_start';
export const CONTROLLER_EVENT_TRIGGER_HOMING = 'homing';
export const CONTROLLER_EVENT_TRIGGER_SLEEP = 'sleep';
export const CONTROLLER_EVENT_TRIGGER_MACRO_LOAD = 'macro_load';
export const CONTROLLER_EVENT_TRIGGER_MACRO_RUN = 'macro_run';

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
export const GLOBAL_OBJECTS = {
  // Function properties
  parseFloat,
  parseInt,

  // Fundamental objects
  Object,
  Function,
  Boolean,

  // Numbers and dates
  Number,
  Math,
  Date,

  // Text processing
  String,
  RegExp,

  // Structured data
  JSON,
};

// Write Source
export const WRITE_SOURCE_CLIENT = 'client';
export const WRITE_SOURCE_SERVER = 'server';
export const WRITE_SOURCE_FEEDER = 'feeder';
export const WRITE_SOURCE_SENDER = 'sender';
