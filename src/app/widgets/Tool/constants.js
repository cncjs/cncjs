import constants from 'namespace-constants';

// M6 Tool Change
export const TOOL_CHANGE_POLICY_IGNORE_M6_COMMANDS = 0;
export const TOOL_CHANGE_POLICY_SEND_M6_COMMANDS = 1;
export const TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_WCS = 2;
export const TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_TLO = 3;
export const TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_CUSTOM_PROBING = 4;

export const {
  MODAL_NONE,
} = constants('widgets/Tool', [
  'MODAL_NONE',
]);
