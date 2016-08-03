import _ from 'lodash';
import React, { Component, PropTypes } from 'react';
import i18n from '../../../lib/i18n';
import Toolbar from './Toolbar';

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

class Grbl extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    shouldComponentUpdate(nextProps, nextState) {
        return !_.isEqual(nextProps, this.props);
    }
    render() {
        const { state, actions } = this.props;
        const { canClick, showGCode } = state;
        const none = '–';
        const controllerState = state.controller.state;
        const activeState = _.get(controllerState, 'status.activeState');
        const parserstate = _.get(controllerState, 'parserstate', {});
        let modal = parserstate.modal || {};

        if (!showGCode) {
            modal = _.mapValues(modal, (word, group) => lookupGCodeDefinition(word));
        }

        return (
            <div>
                <div className="row no-gutters">
                    <div className="col col-xs-12">
                        <Toolbar {...this.props} />
                    </div>
                </div>
                <div className="row no-gutters">
                    <div className="col col-xs-12">
                        <h6>{i18n._('Parser State')}</h6>
                    </div>
                </div>
                <div className="row no-gutters">
                    <div className="col col-xs-3">
                        {i18n._('State')}
                    </div>
                    <div className="col col-xs-3">
                        <div className="well well-xs">
                            {activeState || none}
                        </div>
                    </div>
                    <div className="col col-xs-3">
                        {i18n._('Feed Rate')}
                    </div>
                    <div className="col col-xs-3">
                        <div className="well well-xs">
                            {Number(parserstate.feedrate) || 0}
                        </div>
                    </div>
                </div>
                <div className="row no-gutters">
                    <div className="col col-xs-3">
                        {i18n._('Spindle')}
                    </div>
                    <div className="col col-xs-3">
                        <div className="well well-xs">
                            {Number(parserstate.spindle) || 0}
                        </div>
                    </div>
                    <div className="col col-xs-3">
                        {i18n._('Tool Number')}
                    </div>
                    <div className="col col-xs-3">
                        <div className="well well-xs">
                            {parserstate.tool || none}
                        </div>
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
                        <div className="well well-xs" title={modal.motion}>
                            {modal.motion || none}
                        </div>
                    </div>
                    <div className="col col-xs-3">
                        {i18n._('Coordinate')}
                    </div>
                    <div className="col col-xs-3">
                        <div className="well well-xs" title={modal.coordinate}>
                            {modal.coordinate || none}
                        </div>
                    </div>
                </div>
                <div className="row no-gutters">
                    <div className="col col-xs-3">
                        {i18n._('Plane')}
                    </div>
                    <div className="col col-xs-3">
                        <div className="well well-xs" title={modal.plane}>
                            {modal.plane || none}
                        </div>
                    </div>
                    <div className="col col-xs-3">
                        {i18n._('Distance')}
                    </div>
                    <div className="col col-xs-3">
                        <div className="well well-xs" title={modal.distance}>
                            {modal.distance || none}
                        </div>
                    </div>
                </div>
                <div className="row no-gutters">
                    <div className="col col-xs-3">
                        {i18n._('Feed Rate')}
                    </div>
                    <div className="col col-xs-3">
                        <div className="well well-xs" title={modal.feedrate}>
                            {modal.feedrate || none}
                        </div>
                    </div>
                    <div className="col col-xs-3">
                        {i18n._('Units')}
                    </div>
                    <div className="col col-xs-3">
                        <div className="well well-xs" title={modal.units}>
                            {modal.units || none}
                        </div>
                    </div>
                </div>
                <div className="row no-gutters">
                    <div className="col col-xs-3">
                        {i18n._('Program')}
                    </div>
                    <div className="col col-xs-3">
                        <div className="well well-xs" title={modal.program}>
                            {modal.program || none}
                        </div>
                    </div>
                    <div className="col col-xs-3">
                        {i18n._('Spindle')}
                    </div>
                    <div className="col col-xs-3">
                        <div className="well well-xs" title={modal.spindle}>
                            {modal.spindle || none}
                        </div>
                    </div>
                </div>
                <div className="row no-gutters">
                    <div className="col col-xs-3">
                        {i18n._('Coolant')}
                    </div>
                    <div className="col col-xs-3">
                        <div className="well well-xs" title={modal.coolant}>
                            {modal.coolant || none}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default Grbl;
