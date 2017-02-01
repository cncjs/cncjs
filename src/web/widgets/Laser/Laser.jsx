//import classNames from 'classnames';
import _ from 'lodash';
import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import RepeatButton from '../../components/RepeatButton';
import controller from '../../lib/controller';
import i18n from '../../lib/i18n';
import {
    // Grbl
    GRBL,
    // Smoothie
    SMOOTHIE,
    // TinyG
    TINYG
} from '../../constants';
import styles from './index.styl';

class Laser extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
    getLaserIntensityScale() {
        let scale;
        const { state } = this.props;
        const controllerType = state.controller.type;
        const controllerState = state.controller.state || {};

        if (controllerType === GRBL) {
            const ov = _.get(controllerState, 'status.ov', []);
            scale = ov[2];
        }
        if (controllerType === SMOOTHIE) {
            const ovS = _.get(controllerState, 'status.ovS');
            scale = ovS;
        }
        if (controllerType === TINYG) {
            // Not supported
        }

        return scale;
    }
    render() {
        const { state } = this.props;
        const { canClick } = state;
        const laserIntensityScale = this.getLaserIntensityScale();

        return (
            <div>
                <div className="form-group">
                    <label className="control-label">
                        {i18n._('Laser Intensity Control')}
                    </label>
                    <div className="row no-gutters">
                        <div className="col-xs-3">
                            <div className={styles.droDisplay}>
                                {laserIntensityScale !== undefined ? laserIntensityScale + '%' : ''}
                            </div>
                        </div>
                        <div className="col-xs-9">
                            <div className={styles.droBtnGroup}>
                                <div className="btn-group btn-group-sm" role="group">
                                    <RepeatButton
                                        className="btn btn-default"
                                        style={{ padding: 5 }}
                                        disabled={!canClick}
                                        onClick={() => {
                                            controller.command('spindleOverride', 10);
                                        }}
                                    >
                                        <i className="fa fa-arrow-up fa-fw" />10%
                                    </RepeatButton>
                                    <RepeatButton
                                        className="btn btn-default"
                                        style={{ padding: 5 }}
                                        disabled={!canClick}
                                        onClick={() => {
                                            controller.command('spindleOverride', -10);
                                        }}
                                    >
                                        <i className="fa fa-arrow-down fa-fw" />10%
                                    </RepeatButton>
                                    <RepeatButton
                                        className="btn btn-default"
                                        style={{ padding: 5 }}
                                        disabled={!canClick}
                                        onClick={() => {
                                            controller.command('spindleOverride', 1);
                                        }}
                                    >
                                        <i className="fa fa-arrow-up fa-fw" />1%
                                    </RepeatButton>
                                    <RepeatButton
                                        className="btn btn-default"
                                        style={{ padding: 5 }}
                                        disabled={!canClick}
                                        onClick={() => {
                                            controller.command('spindleOverride', -1);
                                        }}
                                    >
                                        <i className="fa fa-arrow-down fa-fw" />1%
                                    </RepeatButton>
                                    <button
                                        type="button"
                                        className="btn btn-default"
                                        style={{ padding: 5 }}
                                        disabled={!canClick}
                                        onClick={() => {
                                            controller.command('spindleOverride', 0);
                                        }}
                                    >
                                        <i className="fa fa-undo fa-fw" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="form-group">
                    <label className="control-label">
                        {i18n._('Laser Test')}
                    </label>
                </div>
            </div>
        );
    }
}

export default Laser;
