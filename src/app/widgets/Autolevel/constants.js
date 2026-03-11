import constants from 'namespace-constants';

// Wizard view states
export const {
  VIEW_LANDING,
  VIEW_SETUP_PROBE,
  VIEW_PROBING,
  VIEW_APPLY,
} = constants('widgets/Autolevel/views', [
  'VIEW_LANDING',
  'VIEW_SETUP_PROBE',
  'VIEW_PROBING',
  'VIEW_APPLY',
]);

// Probe states
export const {
  PROBE_STATE_IDLE,
  PROBE_STATE_RUNNING,
  PROBE_STATE_PAUSED,
  PROBE_STATE_STOPPED,
  PROBE_STATE_COMPLETED,
} = constants('widgets/Autolevel/probeStates', [
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
  MODAL_TEST_PROBE_CONFIRM,
} = constants('widgets/Autolevel/modals', [
  'MODAL_NONE',
  'MODAL_START_PROBE_CONFIRM',
  'MODAL_STOP_PROBE_CONFIRM',
  'MODAL_TEST_PROBE_CONFIRM',
]);

// Processing phases for G-code compensation pipeline
export const {
  PROCESSING_PHASE_READING,
  PROCESSING_PHASE_COMPENSATING,
  PROCESSING_PHASE_LOADING,
} = constants('widgets/Autolevel/processingPhases', [
  'PROCESSING_PHASE_READING',
  'PROCESSING_PHASE_COMPENSATING',
  'PROCESSING_PHASE_LOADING',
]);
