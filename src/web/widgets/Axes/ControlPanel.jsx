import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Keypad from './Keypad';
import JogDistance from './JogDistance';
import styles from './index.styl';

class ControlPanel extends PureComponent {
    static propTypes = {
        config: PropTypes.object,
        state: PropTypes.object,
        actions: PropTypes.object
    };

    render() {
        return (
            <div className={styles.controlPanel}>
                <Keypad {...this.props} />
                <JogDistance {...this.props} />
            </div>
        );
    }
}

export default ControlPanel;
