import _ from 'lodash';
import React from 'react';
import i18n from '../../../lib/i18n';
import serialport from '../../../lib/serialport';
import {
    ACTIVE_STATE_IDLE,
    METRIC_UNIT
} from './constants';

class ToolbarButton extends React.Component {
    static propTypes = {
        port: React.PropTypes.string,
        activeState: React.PropTypes.string
    };

    cancelTLO() {
        serialport.writeln('G49');
    }
    render() {
        let { port, activeState } = this.props;
        let canClick = (!!port && (activeState === ACTIVE_STATE_IDLE));

        return (
            <div>
                <div className="toolbar-button btn-group">
                    <button type="button" className="btn btn-xs btn-default" onClick={::this.cancelTLO} disabled={!canClick}>{i18n._('Cancel TLO (G49)')}</button>
                </div>
            </div>
        );
    }
}

export default ToolbarButton;
