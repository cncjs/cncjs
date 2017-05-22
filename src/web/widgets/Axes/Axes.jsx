import PropTypes from 'prop-types';
import React from 'react';
import Settings from './Settings';
import Toolbar from './Toolbar';
import DisplayPanel from './DisplayPanel';
import ControlPanel from './ControlPanel';
import {
    MODAL_SETTINGS
} from './constants';

const Axes = (props) => {
    const { state, actions } = props;

    return (
        <div>
            {state.modal.name === MODAL_SETTINGS &&
            <Settings state={state} actions={actions} />
            }
            <Toolbar state={state} actions={actions} />
            <DisplayPanel state={state} actions={actions} />
            <ControlPanel state={state} actions={actions} />
        </div>
    );
};

Axes.propTypes = {
    state: PropTypes.object,
    actions: PropTypes.object
};

export default Axes;
