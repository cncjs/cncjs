import _get from 'lodash/get';
import _mapValues from 'lodash/mapValues';
import { createReducer } from 'redux-action';
import {
    UPDATE_BOUNDING_BOX,
    UPDATE_CONTROLLER_SETTINGS,
    UPDATE_CONTROLLER_STATE,
    UPDATE_FEEDER_STATUS,
    UPDATE_SENDER_STATUS,
    UPDATE_WORKFLOW_STATE,
} from 'app/actions/controller';
import {
    IMPERIAL_UNITS,
    METRIC_UNITS,
} from 'app/constants';
import {
    MACHINE_STATE_NONE,
    REFORMED_MACHINE_STATE_IDLE,
    REFORMED_MACHINE_STATE_RUN,
    REFORMED_MACHINE_STATE_HOLD,
    REFORMED_MACHINE_STATE_ALARM,
    REFORMED_MACHINE_STATE_NA,
    GRBL,
    GRBL_MACHINE_STATE_IDLE,
    GRBL_MACHINE_STATE_RUN,
    GRBL_MACHINE_STATE_HOLD,
    GRBL_MACHINE_STATE_ALARM,
    MARLIN,
    SMOOTHIE,
    SMOOTHIE_MACHINE_STATE_IDLE,
    SMOOTHIE_MACHINE_STATE_RUN,
    SMOOTHIE_MACHINE_STATE_HOLD,
    SMOOTHIE_MACHINE_STATE_ALARM,
    TINYG,
    TINYG_MACHINE_STATE_READY,
    TINYG_MACHINE_STATE_STOP,
    TINYG_MACHINE_STATE_END,
    TINYG_MACHINE_STATE_RUN,
    TINYG_MACHINE_STATE_HOLD,
    TINYG_MACHINE_STATE_ALARM,
} from 'app/constants/controller';
import {
    WORKFLOW_STATE_IDLE,
} from 'app/constants/workflow';
import {
    ensurePositiveNumber,
} from 'app/lib/ensure-type';
import {
    in2mm,
} from 'app/lib/units';

const initialState = {
    type: null,
    settings: {},
    state: {},

    machineState: MACHINE_STATE_NONE,
    reformedMachineState: MACHINE_STATE_NONE,
    mpos: {},
    wpos: {},
    modal: {},

    boundingBox: {
        min: { x: 0, y: 0, z: 0 },
        max: { x: 0, y: 0, z: 0 },
    },

    feeder: {
        status: null,
    },

    sender: {
        status: null,
    },

    workflow: {
        state: WORKFLOW_STATE_IDLE,
    },
};

const mapContextToMachineStates = (context) => {
    const { type, state } = context;

    // Grbl
    if (type === GRBL) {
        const machineState = _get(state, 'status.machineState');
        const reformedMachineState = ({
            [GRBL_MACHINE_STATE_IDLE]: REFORMED_MACHINE_STATE_IDLE,
            [GRBL_MACHINE_STATE_RUN]: REFORMED_MACHINE_STATE_RUN,
            [GRBL_MACHINE_STATE_HOLD]: REFORMED_MACHINE_STATE_HOLD,
            [GRBL_MACHINE_STATE_ALARM]: REFORMED_MACHINE_STATE_ALARM,
        }[machineState]) || REFORMED_MACHINE_STATE_NA;

        return {
            machineState,
            reformedMachineState,
        };
    }

    // Marlin
    if (type === MARLIN) {
        const machineState = _get(state, 'machineState');
        const reformedMachineState = MACHINE_STATE_NONE;

        return {
            machineState,
            reformedMachineState,
        };
    }

    // Smoothieware
    if (type === SMOOTHIE) {
        const machineState = _get(state, 'status.machineState');
        const reformedMachineState = ({
            [SMOOTHIE_MACHINE_STATE_IDLE]: REFORMED_MACHINE_STATE_IDLE,
            [SMOOTHIE_MACHINE_STATE_RUN]: REFORMED_MACHINE_STATE_RUN,
            [SMOOTHIE_MACHINE_STATE_HOLD]: REFORMED_MACHINE_STATE_HOLD,
            [SMOOTHIE_MACHINE_STATE_ALARM]: REFORMED_MACHINE_STATE_ALARM,
        }[machineState]) || REFORMED_MACHINE_STATE_NA;

        return {
            machineState,
            reformedMachineState,
        };
    }

    // TinyG
    if (type === TINYG) {
        const machineState = _get(state, 'machineState');
        const reformedMachineState = ({
            [TINYG_MACHINE_STATE_READY]: REFORMED_MACHINE_STATE_IDLE,
            [TINYG_MACHINE_STATE_STOP]: REFORMED_MACHINE_STATE_IDLE,
            [TINYG_MACHINE_STATE_END]: REFORMED_MACHINE_STATE_IDLE,
            [TINYG_MACHINE_STATE_RUN]: REFORMED_MACHINE_STATE_RUN,
            [TINYG_MACHINE_STATE_HOLD]: REFORMED_MACHINE_STATE_HOLD,
            [TINYG_MACHINE_STATE_ALARM]: REFORMED_MACHINE_STATE_ALARM,
        }[machineState]) || REFORMED_MACHINE_STATE_NA;

        return {
            machineState,
            reformedMachineState,
        };
    }

    return {
        machineState: MACHINE_STATE_NONE,
        reformedMachineState: MACHINE_STATE_NONE,
    };
};

// Gets the machine position.
// @return {object} Returns a position object which contains x, y, z, a, b, and c properties.
const mapContextToMachinePosition = (context) => {
    const { type, settings, state } = context;
    const defaultMachinePosition = {
        x: '0.000',
        y: '0.000',
        z: '0.000',
        a: '0.000',
        b: '0.000',
        c: '0.000',
    };

    // Grbl
    if (type === GRBL) {
        const mpos = _get(state, 'status.mpos');
        const $13 = ensurePositiveNumber(_get(settings, 'settings.$13')); // report inches

        // Machine position is reported in mm ($13=0) or inches ($13=1)
        return _mapValues({
            ...defaultMachinePosition,
            ...mpos,
        }, (val) => {
            return ($13 > 0) ? in2mm(val) : val;
        });
    }

    // Marlin
    if (type === MARLIN) {
        const pos = _get(state, 'pos');

        // Machine position is reported in mm regardless of the current units
        return {
            ...defaultMachinePosition,
            ...pos,
        };
    }

    // Smoothieware
    if (type === SMOOTHIE) {
        const mpos = _get(state, 'status.mpos');
        const modalUnits = _get(state, 'status.modal.units');
        const units = {
            'G20': IMPERIAL_UNITS,
            'G21': METRIC_UNITS,
        }[modalUnits];

        // Machine position is reported in current units
        return _mapValues({
            ...defaultMachinePosition,
            ...mpos,
        }, (val) => {
            return (units === IMPERIAL_UNITS) ? in2mm(val) : val;
        });
    }

    // TinyG
    if (type === TINYG) {
        const mpos = _get(state, 'mpos');

        // https://github.com/synthetos/g2/wiki/Status-Reports
        // Canonical machine position are always reported in millimeters with no offsets.
        return {
            ...defaultMachinePosition,
            ...mpos,
        };
    }

    return defaultMachinePosition;
};

// Gets the work position.
// @return {object} Returns a position object which contains x, y, z, a, b, and c properties.
const mapContextToWorkPosition = (context) => {
    const { type, settings, state } = context;
    const defaultWorkPosition = {
        x: '0.000',
        y: '0.000',
        z: '0.000',
        a: '0.000',
        b: '0.000',
        c: '0.000',
    };

    // Grbl
    if (type === GRBL) {
        const wpos = _get(state, 'status.wpos');
        const $13 = ensurePositiveNumber(_get(settings, 'settings.$13')); // report inches

        // Work position is reported in mm ($13=0) or inches ($13=1)
        return _mapValues({
            ...defaultWorkPosition,
            ...wpos,
        }, val => {
            return ($13 > 0) ? in2mm(val) : val;
        });
    }

    // Marlin
    if (type === MARLIN) {
        const pos = _get(state, 'pos');

        // Work position is reported in mm regardless of the current units
        return {
            ...defaultWorkPosition,
            ...pos,
        };
    }

    // Smoothieware
    if (type === SMOOTHIE) {
        const wpos = _get(state, 'status.wpos');
        const modalUnits = _get(state, 'status.modal.units');
        const units = {
            'G20': IMPERIAL_UNITS,
            'G21': METRIC_UNITS,
        }[modalUnits];

        // Work position is reported in current units
        return _mapValues({
            ...defaultWorkPosition,
            ...wpos,
        }, (val) => {
            return (units === IMPERIAL_UNITS) ? in2mm(val) : val;
        });
    }

    // TinyG
    if (type === TINYG) {
        const wpos = _get(state, 'wpos');
        const modalUnits = _get(state, 'modal.units');
        const units = {
            'G20': IMPERIAL_UNITS,
            'G21': METRIC_UNITS,
        }[modalUnits];

        // Work position is reported in current units, and also apply any offsets.
        return _mapValues({
            ...defaultWorkPosition,
            ...wpos,
        }, (val) => {
            return (units === IMPERIAL_UNITS) ? in2mm(val) : val;
        });
    }

    return defaultWorkPosition;
};

// Gets the modal group.
// @return {object} Returns the modal group.
const mapContextToModalGroup = (context) => {
    const { type, state } = context;
    const defaultModalGroup = {
        motion: '', // G0, G1, G2, G3, G38.2, G38.3, G38.4, G38.5, G80
        plane: '', // G17: xy-plane, G18: xz-plane, G19: yz-plane
        units: '', // G20: Inches, G21: Millimeters
        wcs: '', // G54, G55, G56, G57, G58, G59
        path: '', // G61: Exact path mode, G61.1: Exact stop mode, G64: Continuous mode
        distance: '', // G90: Absolute, G91: Relative
        feedrate: '', // G93: Inverse time mode, G94: Units per minute
        program: '', // M0, M1, M2, M30
        spindle: '', // M3: Spindle (cw), M4: Spindle (ccw), M5: Spindle off
        coolant: '', // M7: Mist coolant, M8: Flood coolant, M9: Coolant off, [M7,M8]: Both on
    };

    // Grbl
    if (type === GRBL) {
        const modal = _get(state, 'parserstate.modal');
        return {
            ...defaultModalGroup,
            ...modal,
        };
    }

    // Marlin
    if (type === MARLIN) {
        const modal = _get(state, 'modal');
        return {
            ...defaultModalGroup,
            ...modal,
        };
    }

    // Smoothie
    if (type === SMOOTHIE) {
        const modal = _get(state, 'parserstate.modal');
        return {
            ...defaultModalGroup,
            ...modal,
        };
    }

    // TinyG
    if (type === TINYG) {
        const modal = _get(state, 'modal');
        return {
            ...defaultModalGroup,
            ...modal,
        };
    }

    return defaultModalGroup;
};

const reducer = createReducer(initialState, {
    [UPDATE_CONTROLLER_SETTINGS]: (payload, reducerState) => {
        const { type, settings } = payload;
        const state = _get(reducerState, 'state');

        // Only Grbl needs to update machine position and work position in accordance with the value of $13.
        if (type === GRBL) {
            const context = { type, settings, state };
            const mpos = mapContextToMachinePosition(context);
            const wpos = mapContextToWorkPosition(context);

            return {
                type,
                settings,
                mpos,
                wpos,
            };
        }

        return {
            type: payload.type,
            settings: payload.settings,
        };
    },

    [UPDATE_CONTROLLER_STATE]: (payload, reducerState) => {
        const { type, state } = payload;
        const settings = _get(state, 'settings'); // from previous state
        const context = { type, settings, state };
        const {
            machineState,
            reformedMachineState,
        } = mapContextToMachineStates(context);
        const mpos = mapContextToMachinePosition(context);
        const wpos = mapContextToWorkPosition(context);
        const modal = mapContextToModalGroup(context);

        return {
            type,
            state,
            machineState,
            reformedMachineState,
            mpos,
            wpos,
            modal,
        };
    },

    [UPDATE_BOUNDING_BOX]: (payload, state) => ({
        boundingBox: {
            ...state.boundingBox,
            ..._get(payload, 'boundingBox'),
        }
    }),

    [UPDATE_FEEDER_STATUS]: (payload, state) => ({
        feeder: {
            status: _get(payload, 'status', _get(state, 'status')),
        },
    }),

    [UPDATE_SENDER_STATUS]: (payload, state) => ({
        sender: {
            status: _get(payload, 'status', _get(state, 'status')),
        },
    }),

    // @param {string} [payload.state] The workflow state. One of: 'idle, 'paused', 'running'
    [UPDATE_WORKFLOW_STATE]: (payload, state) => ({
        workflow: {
            state: _get(payload, 'state', _get(state, 'state')) || initialState.state, // 'state' is required and cannot be null
        },
    }),
});

export default reducer;
