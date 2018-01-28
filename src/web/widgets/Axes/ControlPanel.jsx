import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Panel from './components/Panel';
import Keypad from './Keypad';

class ControlPanel extends PureComponent {
    static propTypes = {
        config: PropTypes.object,
        state: PropTypes.object,
        actions: PropTypes.object
    };

    render() {
        return (
            <Panel>
                <Keypad {...this.props} />
            </Panel>
        );
    }
}

export default ControlPanel;
