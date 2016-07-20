import _ from 'lodash';
import React, { Component, PropTypes } from 'react';
import controller from '../../../lib/controller';
import i18n from '../../../lib/i18n';

class Spindle extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    shouldComponentUpdate(nextProps, nextState) {
        return !_.isEqual(nextProps, this.props);
    }
    render() {
        const { state, actions } = this.props;
        const { canClick, isCCWChecked, spindleSpeed } = state;
        const cmd = isCCWChecked ? 'M4' : 'M3';

        return (
            <div>
                <div className="btn-toolbar" role="toolbar">
                    <div className="btn-group btn-group-sm" role="group">
                        <button
                            type="button"
                            className="btn btn-default"
                            onClick={() => {
                                if (spindleSpeed > 0) {
                                    controller.command('gcode', cmd + ' S' + spindleSpeed);
                                } else {
                                    controller.command('gcode', cmd);
                                }
                            }}
                            title={i18n._('Start the spindle turning CW/CCW (M3/M4)')}
                            disabled={!canClick}
                        >
                            <i className="fa fa-play"></i>
                        </button>
                        <button
                            type="button"
                            className="btn btn-default"
                            onClick={() => controller.command('gcode', 'M5')}
                            title={i18n._('Stop the spindle from turning (M5)')}
                            disabled={!canClick}
                        >
                            <i className="fa fa-stop"></i>
                        </button>
                    </div>
                </div>
                <div className="checkbox" >
                    <label>
                        <input
                            type="checkbox"
                            checked={isCCWChecked}
                            onChange={actions.handleCCWChange}
                            disabled={!canClick}
                        />
                        &nbsp;{i18n._('Turn counterclockwise')}
                    </label>
                </div>
            </div>
        );
    }
}

export default Spindle;
