import _ from 'lodash';
import React, { Component, PropTypes } from 'react';
import CSSModules from 'react-css-modules';
import ConsoleInput from './ConsoleInput';
import ConsoleWindow from './ConsoleWindow';
import styles from './index.styl';

@CSSModules(styles)
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
            <div styleName="console-container">
                <ConsoleInput {...this.props} />
                <ConsoleWindow {...this.props} />
            </div>
        );
    }
}

export default Console;
