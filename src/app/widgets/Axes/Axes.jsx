import PropTypes from 'prop-types';
import React from 'react';
import DisplayPanel from './DisplayPanel';
import ControlPanel from './ControlPanel';
import MDIPanel from './MDIPanel';

const Axes = (props) => {
    const { config, state, actions } = props;
    const showMDIPanel = !state.mdi.disabled && (state.mdi.commands.length > 0);

    return (
        <div>
            <DisplayPanel config={config} state={state} actions={actions} />
            <ControlPanel config={config} state={state} actions={actions} />
            {showMDIPanel &&
            <MDIPanel config={config} state={state} actions={actions} />
            }
        </div>
    );
};

Axes.propTypes = {
    config: PropTypes.object,
    state: PropTypes.object,
    actions: PropTypes.object
};

export default Axes;
