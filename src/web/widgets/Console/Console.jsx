import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import ConsoleInput from './ConsoleInput';
import ConsoleWindow from './ConsoleWindow';
import styles from './index.styl';

class Console extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
    render() {
        return (
            <div className={styles['console-container']}>
                <ConsoleInput {...this.props} />
                <ConsoleWindow {...this.props} />
            </div>
        );
    }
}

export default Console;
