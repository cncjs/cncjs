import constants from 'namespace-constants';

// Wizard view states
export const {
  VIEW_LANDING,
  VIEW_SETUP_PROBE,
  VIEW_PROBING,
  VIEW_LOAD_PROBE,
  VIEW_APPLY,
} = constants('widgets/AutoLevel/views', [
  'VIEW_LANDING',
  'VIEW_SETUP_PROBE',
  'VIEW_PROBING',
  'VIEW_LOAD_PROBE',
  'VIEW_APPLY',
]);

// Probe states
export const {
  PROBE_STATE_IDLE,
  PROBE_STATE_RUNNING,
  PROBE_STATE_PAUSED,
  PROBE_STATE_STOPPED,
  PROBE_STATE_COMPLETED,
} = constants('widgets/AutoLevel/probeStates', [
  'PROBE_STATE_IDLE',
  'PROBE_STATE_RUNNING',
  'PROBE_STATE_PAUSED',
  'PROBE_STATE_STOPPED',
  'PROBE_STATE_COMPLETED',
]);

// Modal types (for confirmation dialogs)
export const {
  MODAL_NONE,
  MODAL_START_PROBE_CONFIRM,
  MODAL_STOP_PROBE_CONFIRM,
} = constants('widgets/AutoLevel/modals', [
  'MODAL_NONE',
  'MODAL_START_PROBE_CONFIRM',
  'MODAL_STOP_PROBE_CONFIRM',
]);
