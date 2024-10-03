import {
  CONTROLLER_COMMAND_SENDER_LOAD,
  CONTROLLER_COMMAND_SENDER_UNLOAD,
  CONTROLLER_COMMAND_SENDER_START,
  CONTROLLER_COMMAND_SENDER_STOP,
  CONTROLLER_COMMAND_SENDER_PAUSE,
  CONTROLLER_COMMAND_SENDER_RESUME,
  CONTROLLER_COMMAND_GCODE,
  CONTROLLER_COMMAND_JOG_CANCEL,
  CONTROLLER_COMMAND_FEED_OVERRIDE,
  CONTROLLER_COMMAND_RAPID_OVERRIDE,
  CONTROLLER_COMMAND_SPINDLE_OVERRIDE,
  CONTROLLER_COMMAND_LASER_TEST,
  CONTROLLER_COMMAND_MACRO_LOAD,
  CONTROLLER_COMMAND_MACRO_RUN,
  CONTROLLER_COMMAND_WATCHDIR_LOAD,
} from './constants';

const getDeprecatedCommandHandler = (deprecatedCommand) => ({
  'start': (fn) => {
    fn(CONTROLLER_COMMAND_SENDER_START);
  },
  'stop': (fn, ...args) => {
    fn(CONTROLLER_COMMAND_SENDER_STOP, ...args);
  },
  'pause': (fn) => {
    fn(CONTROLLER_COMMAND_SENDER_PAUSE);
  },
  'resume': (fn) => {
    fn(CONTROLLER_COMMAND_SENDER_RESUME);
  },
  'gcode:load': (fn, ...args) => {
    const noop = () => {};
    let [name, gcode, context = {}, callback = noop] = args;
    const meta = {
      name: name,
      content: gcode,
    };
    fn(CONTROLLER_COMMAND_SENDER_LOAD, meta, context, callback);
  },
  'gcode:unload': (fn) => {
    fn(CONTROLLER_COMMAND_SENDER_UNLOAD);
  },
  'gcode:start': (fn) => {
    fn(CONTROLLER_COMMAND_SENDER_START);
  },
  'gcode:stop': (fn, ...args) => {
    fn(CONTROLLER_COMMAND_SENDER_STOP, ...args);
  },
  'gcode:pause': (fn) => {
    fn(CONTROLLER_COMMAND_SENDER_PAUSE);
  },
  'gcode:resume': (fn) => {
    fn(CONTROLLER_COMMAND_SENDER_RESUME);
  },
  'feeder:feed': (fn, ...args) => {
    fn(CONTROLLER_COMMAND_GCODE, ...args);
  },
  'jogCancel': (fn) => {
    fn(CONTROLLER_COMMAND_JOG_CANCEL);
  },
  'feedOverride': (fn, ...args) => {
    fn(CONTROLLER_COMMAND_FEED_OVERRIDE, ...args);
  },
  'spindleOverride': (fn, ...args) => {
    fn(CONTROLLER_COMMAND_SPINDLE_OVERRIDE, ...args);
  },
  'rapidOverride': (fn, ...args) => {
    fn(CONTROLLER_COMMAND_RAPID_OVERRIDE, ...args);
  },
  'lasertest:on': (fn, ...args) => {
    fn(CONTROLLER_COMMAND_LASER_TEST, ...args);
  },
  'lasertest:off': (fn) => {
    const power = 0;
    fn(CONTROLLER_COMMAND_LASER_TEST, power);
  },
  'macro:load': (fn, ...args) => {
    fn(CONTROLLER_COMMAND_MACRO_LOAD, ...args);
  },
  'macro:run': (fn, ...args) => {
    fn(CONTROLLER_COMMAND_MACRO_RUN, ...args);
  },
  'watchdir:load': (fn, ...args) => {
    fn(CONTROLLER_COMMAND_WATCHDIR_LOAD, ...args);
  },
}[deprecatedCommand]);

export {
  getDeprecatedCommandHandler,
};
