import _ from 'lodash';
import React, { Component, PropTypes } from 'react';
import ConsoleInput from './ConsoleInput';
import ConsoleWindow from './ConsoleWindow';
import styles from './index.styl';

class Console extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    shouldComponentUpdate(nextProps, nextState) {
        return !_.isEqual(nextProps, this.props);
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
