import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import JogPad from './JogPad';
import JogDistance from './JogDistance';
import MotionButtonGroup from './MotionButtonGroup';
import styles from './index.styl';

class ControlPanel extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
    render() {
        return (
            <div className={styles.controlPanel}>
                <div className="row no-gutters">
                    <div className="col-xs-6">
                        <JogPad {...this.props} />
                    </div>
                    <div className="col-xs-6">
                        <MotionButtonGroup {...this.props} />
                    </div>
                </div>
                <div className="row no-gutters">
                    <div className="col-xs-12">
                        <JogDistance {...this.props} />
                    </div>
                </div>
            </div>
        );
    }
}

export default ControlPanel;
