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

// Tool Change Policy (M6)
export const TOOL_CHANGE_POLICY_SEND = 0; // Send M6 commands
export const TOOL_CHANGE_POLICY_IGNORE = 1; // Ignore M6 commands
export const TOOL_CHANGE_POLICY_PAUSE = 2; // Pause for manual tool change

// Write Source
export const WRITE_SOURCE_CLIENT = 'client';
export const WRITE_SOURCE_SERVER = 'server';
export const WRITE_SOURCE_FEEDER = 'feeder';
export const WRITE_SOURCE_SENDER = 'sender';
