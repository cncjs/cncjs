import _ from 'lodash';
import React, { Component, PropTypes } from 'react';
import { ProgressBar } from 'react-bootstrap';
import i18n from '../../../lib/i18n';
import Toolbar from './Toolbar';
import {
    TINYG2_MACHINE_STATE_INIT,
    TINYG2_MACHINE_STATE_READY,
    TINYG2_MACHINE_STATE_ALARM,
    TINYG2_MACHINE_STATE_STOP,
    TINYG2_MACHINE_STATE_END,
    TINYG2_MACHINE_STATE_RUN,
    TINYG2_MACHINE_STATE_HOLD,
    TINYG2_MACHINE_STATE_PROBE,
    TINYG2_MACHINE_STATE_CYCLING,
    TINYG2_MACHINE_STATE_HOMING,
    TINYG2_MACHINE_STATE_JOGGING,
    TINYG2_MACHINE_STATE_SHUTDOWN
} from '../../../constants';

const lookupGCodeDefinition = (word) => {
    const wordText = {
        // Motion
        'G0': i18n._('Rapid Move'),
        'G1': i18n._('Linear Move'),
        'G2': i18n._('CW Arc'),
        'G3': i18n._('CCW Arc'),
        'G38.2': i18n._('Probing'),
        'G38.3': i18n._('Probing'),
        'G38.4': i18n._('Probing'),
        'G38.5': i18n._('Probing'),
        'G80': i18n._('Cancel Mode'),

        // Work Coordinate System
        'G54': 'G54 (P1)',
        'G55': 'G55 (P2)',
        'G56': 'G56 (P3)',
        'G57': 'G57 (P4)',
        'G58': 'G58 (P5)',
        'G59': 'G59 (P6)',

        // Plane
        'G17': i18n._('XY Plane'),
        'G18': i18n._('XZ Plane'),
        'G19': i18n._('YZ Plane'),

        // Units
        'G20': i18n._('Inches'),
        'G21': i18n._('Millimeters'),

        // Distance
        'G90': i18n._('Absolute'),
        'G91': i18n._('Relative'),

        // Feed Rate
        'G93': i18n._('Inverse Time'),
        'G94': i18n._('Units/Min'),

        // Tool Length Offset
        'G43.1': i18n._('Active Tool Offset'),
        'G49': i18n._('No Tool Offset'),

        // Program
        'M0': i18n._('Stop'),
        'M1': i18n._('Stop'),
        'M2': i18n._('End'),
        'M30': i18n._('End'),

        // Spindle
        'M3': i18n._('On (CW)'),
        'M4': i18n._('On (CCW)'),
        'M5': i18n._('Off'),

        // Coolant
        'M7': i18n._('Mist'),
        'M8': i18n._('Flood'),
        'M9': i18n._('Off')
    };

    return (wordText[word] || word);
};

class TinyG2 extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    // See src/app/controllers/TinyG2/constants.js
    plannerBufferMax = 28; // default pool size
    plannerBufferMin = 8; // low water mark

    shouldComponentUpdate(nextProps, nextState) {
        return !_.isEqual(nextProps, this.props);
    }
    render() {
        const { state, actions } = this.props;
        const { canClick, showGCode } = state;
        const none = '–';
        const controllerState = state.controller.state;
        const machineState = _.get(controllerState, 'sr.machineState');
        const machineStateText = {
            [TINYG2_MACHINE_STATE_INIT]: i18n.t('controller:TinyG2.machineState.init'),
            [TINYG2_MACHINE_STATE_READY]: i18n.t('controller:TinyG2.machineState.ready'),
            [TINYG2_MACHINE_STATE_ALARM]: i18n.t('controller:TinyG2.machineState.alarm'),
            [TINYG2_MACHINE_STATE_STOP]: i18n.t('controller:TinyG2.machineState.stop'),
            [TINYG2_MACHINE_STATE_END]: i18n.t('controller:TinyG2.machineState.end'),
            [TINYG2_MACHINE_STATE_RUN]: i18n.t('controller:TinyG2.machineState.run'),
            [TINYG2_MACHINE_STATE_HOLD]: i18n.t('controller:TinyG2.machineState.hold'),
            [TINYG2_MACHINE_STATE_PROBE]: i18n.t('controller:TinyG2.machineState.probe'),
            [TINYG2_MACHINE_STATE_CYCLING]: i18n.t('controller:TinyG2.machineState.cycling'),
            [TINYG2_MACHINE_STATE_HOMING]: i18n.t('controller:TinyG2.machineState.homing'),
            [TINYG2_MACHINE_STATE_JOGGING]: i18n.t('controller:TinyG2.machineState.jogging'),
            [TINYG2_MACHINE_STATE_SHUTDOWN]: i18n.t('controller:TinyG2.machineState.shutdown')
        }[machineState];
        const plannerBuffer = _.get(controllerState, 'qr') || 0;
        const feedrate = _.get(controllerState, 'sr.feedrate');
        const velocity = _.get(controllerState, 'sr.velocity');
        const line = _.get(controllerState, 'sr.line');
        let modal = _.get(controllerState, 'sr.modal', {});

        if (!showGCode) {
            modal = _.mapValues(modal, (word, group) => lookupGCodeDefinition(word));
        }

        this.plannerBufferMin = Math.min(this.plannerBufferMin, plannerBuffer);
        this.plannerBufferMax = Math.max(this.plannerBufferMax, plannerBuffer);

        return (
            <div>
                <div className="row no-gutters">
                    <div className="col col-xs-12">
                        <Toolbar {...this.props} className="pull-right" />
                    </div>
                </div>
                <div className="row no-gutters">
                    <div className="col col-xs-12">
                        <h6>{i18n._('Queue Reports')}</h6>
                    </div>
                </div>
                <div className="row no-gutters">
                    <div className="col col-xs-6">
                        {i18n._('Planner Buffer')}
                    </div>
                    <div className="col col-xs-6">
                        <ProgressBar
                            style={{ marginBottom: 0 }}
                            bsStyle={plannerBuffer === this.plannerBufferMin ? 'warning' : 'default' }
                            min={this.plannerBufferMin}
                            max={this.plannerBufferMax}
                            now={plannerBuffer}
                            label={plannerBuffer}
                        />
                    </div>
                </div>
                <div className="row no-gutters">
                    <div className="col col-xs-12">
                        <h6>{i18n._('Status Reports')}</h6>
                    </div>
                </div>
                <div className="row no-gutters">
                    <div className="col col-xs-3">
                        {i18n._('State')}
                    </div>
                    <div className="col col-xs-3">
                        <div className="well well-xs">{machineStateText || none}</div>
                    </div>
                    <div className="col col-xs-3">
                        {i18n._('Feed Rate')}
                    </div>
                    <div className="col col-xs-3">
                        <div className="well well-xs">{Number(feedrate) || 0}</div>
                    </div>
                </div>
                <div className="row no-gutters">
                    <div className="col col-xs-3">
                        {i18n._('Velocity')}
                    </div>
                    <div className="col col-xs-3">
                        <div className="well well-xs">{Number(velocity) || 0}</div>
                    </div>
                    <div className="col col-xs-3">
                        {i18n._('Line')}
                    </div>
                    <div className="col col-xs-3">
                        <div className="well well-xs">{Number(line) || 0}</div>
                    </div>
                </div>
                <div className="row no-gutters">
                    <div className="col col-xs-6">
                        <h6>{i18n._('Modal Groups')}</h6>
                    </div>
                    <div className="col col-xs-6 text-right">
                        <button
                            type="button"
                            className="btn btn-xs btn-default btn-toggle-display"
                            onClick={actions.toggleDisplay}
                            disabled={!canClick}
                        >
                            {i18n._('Toggle Display')}
                        </button>
                    </div>
                </div>
                <div className="row no-gutters">
                    <div className="col col-xs-3">
                        {i18n._('Motion')}
                    </div>
                    <div className="col col-xs-3">
                        <div className="well well-xs">{modal.motion || none}</div>
                    </div>
                    <div className="col col-xs-3">
                        {i18n._('Coordinate')}
                    </div>
                    <div className="col col-xs-3">
                        <div className="well well-xs">{modal.coordinate || none}</div>
                    </div>
                </div>
                <div className="row no-gutters">
                    <div className="col col-xs-3">
                        {i18n._('Plane')}
                    </div>
                    <div className="col col-xs-3">
                        <div className="well well-xs">{modal.plane || none}</div>
                    </div>
                    <div className="col col-xs-3">
                        {i18n._('Distance')}
                    </div>
                    <div className="col col-xs-3">
                        <div className="well well-xs">{modal.distance || none}</div>
                    </div>
                </div>
                <div className="row no-gutters">
                    <div className="col col-xs-3">
                        {i18n._('Feed Rate')}
                    </div>
                    <div className="col col-xs-3">
                        <div className="well well-xs">{modal.feedrate || none}</div>
                    </div>
                    <div className="col col-xs-3">
                        {i18n._('Units')}
                    </div>
                    <div className="col col-xs-3">
                        <div className="well well-xs">{modal.units || none}</div>
                    </div>
                </div>
                <div className="row no-gutters">
                    <div className="col col-xs-3">
                        {i18n._('Path')}
                    </div>
                    <div className="col col-xs-3">
                        <div className="well well-xs">{modal.path || none}</div>
                    </div>
                </div>
            </div>
        );
    }
}

export default TinyG2;
