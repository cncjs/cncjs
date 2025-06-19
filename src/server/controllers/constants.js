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

// Builtin Commands
export const BUILTIN_COMMAND_MSG = '%msg';
export const BUILTIN_COMMAND_WAIT = '%wait';

// M6 Tool Change
export const TOOL_CHANGE_POLICY_IGNORE_M6_COMMANDS = 0;
export const TOOL_CHANGE_POLICY_SEND_M6_COMMANDS = 1;
export const TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_WCS = 2;
export const TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_TLO = 3;
export const TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_CUSTOM_PROBING = 4;

// Units
export const IMPERIAL_UNITS = 'in';
export const METRIC_UNITS = 'mm';

// Write Source
export const WRITE_SOURCE_CLIENT = 'client';
export const WRITE_SOURCE_SERVER = 'server';
export const WRITE_SOURCE_FEEDER = 'feeder';
export const WRITE_SOURCE_SENDER = 'sender';
