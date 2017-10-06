import constants from 'namespace-constants';

export const {
    MODAL_WATCH_DIRECTORY,
    M0_PROGRAM_PAUSE,
    M1_PROGRAM_PAUSE,
    M2_PROGRAM_END,
    M6_TOOL_CHANGE,
    M30_PROGRAM_END
} = constants('widgets/Visualizer', [
    'MODAL_WATCH_DIRECTORY',
    'M0_PROGRAM_PAUSE',
    'M1_PROGRAM_PAUSE',
    'M2_PROGRAM_END',
    'M6_TOOL_CHANGE',
    'M30_PROGRAM_END'
]);

export const CAMERA_MODE_PAN = 'pan';
export const CAMERA_MODE_ROTATE = 'rotate';

