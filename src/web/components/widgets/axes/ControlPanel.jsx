import { isEqual } from 'lodash';
import React, { Component, PropTypes } from 'react';
import JogPad from './JogPad';
import JogDistance from './JogDistance';
import MotionButtonGroup from './MotionButtonGroup';

class ControlPanel extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    shouldComponentUpdate(nextProps, nextState) {
        return !isEqual(nextProps, this.props);
    }
    render() {
        return (
            <div className="control-panel">
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
