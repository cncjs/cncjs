import _ from 'lodash';
import classNames from 'classnames';
import React, { Component, PropTypes } from 'react';
import i18n from '../../../lib/i18n';
import ToolbarButton from './ToolbarButton';
import {
    METRIC_UNITS
} from '../../../constants';

class Probe extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    shouldComponentUpdate(nextProps, nextState) {
        return !_.isEqual(nextProps, this.props);
    }
    render() {
        const { state, actions } = this.props;
        const { canClick, units, probeCommand, probeDepth, probeFeedrate, tlo, retractionDistance } = state;
        const displayUnits = (units === METRIC_UNITS) ? i18n._('mm') : i18n._('in');
        const feedrateUnits = (units === METRIC_UNITS) ? i18n._('mm/min') : i18n._('in/mm');
        const step = (units === METRIC_UNITS) ? 1 : 0.1;
        const classes = {
            'G38.2': classNames(
                'btn',
                'btn-default',
                { 'btn-select': probeCommand === 'G38.2' }
            ),
            'G38.3': classNames(
                'btn',
                'btn-default',
                { 'btn-select': probeCommand === 'G38.3' }
            ),
            'G38.4': classNames(
                'btn',
                'btn-default',
                { 'btn-select': probeCommand === 'G38.4' }
            ),
            'G38.5': classNames(
                'btn',
                'btn-default',
                { 'btn-select': probeCommand === 'G38.5' }
            )
        };

        return (
            <div>
                <ToolbarButton {...this.props} />
                <div className="form-group">
                    <label className="control-label">{i18n._('Probe Command')}</label>
                    <div className="btn-toolbar" role="toolbar">
                        <div className="btn-group btn-group-xs">
                            <button
                                type="button"
                                className={classes['G38.2']}
                                title={i18n._('G38.2 probe toward workpiece, stop on contact, signal error if failure')}
                                onClick={() => actions.changeProbeCommand('G38.2')}
                            >
                                G38.2
                            </button>
                            <button
                                type="button"
                                className={classes['G38.3']}
                                title={i18n._('G38.3 probe toward workpiece, stop on contact')}
                                onClick={() => actions.changeProbeCommand('G38.3')}
                            >
                                G38.3
                            </button>
                            <button
                                type="button"
                                className={classes['G38.4']}
                                title={i18n._('G38.4 probe away from workpiece, stop on loss of contact, signal error if failure')}
                                onClick={() => actions.changeProbeCommand('G38.4')}
                            >
                                G38.4
                            </button>
                            <button
                                type="button"
                                className={classes['G38.5']}
                                title={i18n._('G38.5 probe away from workpiece, stop on loss of contact')}
                                onClick={() => actions.changeProbeCommand('G38.5')}
                            >
                                G38.5
                            </button>
                        </div>
                    </div>
                    <p className="probe-command-description">
                    {probeCommand === 'G38.2' &&
                        <i>{i18n._('G38.2 probe toward workpiece, stop on contact, signal error if failure')}</i>
                    }
                    {probeCommand === 'G38.3' &&
                        <i>{i18n._('G38.3 probe toward workpiece, stop on contact')}</i>
                    }
                    {probeCommand === 'G38.4' &&
                        <i>{i18n._('G38.4 probe away from workpiece, stop on loss of contact, signal error if failure')}</i>
                    }
                    {probeCommand === 'G38.5' &&
                        <i>{i18n._('G38.5 probe away from workpiece, stop on loss of contact')}</i>
                    }
                    </p>
                </div>
                <div className="row no-gutters probe-options">
                    <div className="col-xs-6">
                        <div className="form-group">
                            <label className="control-label">{i18n._('Probe Depth')}</label>
                            <div className="input-group input-group-xs">
                                <input
                                    type="number"
                                    className="form-control"
                                    value={probeDepth}
                                    placeholder="0.00"
                                    min={0}
                                    step={step}
                                    onChange={actions.handleProbeDepthChange}
                                />
                                <div className="input-group-addon">{displayUnits}</div>
                            </div>
                        </div>
                    </div>
                    <div className="col-xs-6">
                        <div className="form-group">
                            <label className="control-label">{i18n._('Probe Feedrate')}</label>
                            <div className="input-group input-group-xs">
                                <input
                                    type="number"
                                    className="form-control"
                                    value={probeFeedrate}
                                    placeholder="0.00"
                                    min={0}
                                    step={step}
                                    onChange={actions.handleProbeFeedrateChange}
                                />
                                <span className="input-group-addon">{feedrateUnits}</span>
                            </div>
                        </div>
                    </div>
                    <div className="col-xs-6">
                        <div className="form-group">
                            <label className="control-label">{i18n._('Touch Plate Thickness')}</label>
                            <div className="input-group input-group-xs">
                                <input
                                    type="number"
                                    className="form-control"
                                    value={tlo}
                                    placeholder="0.00"
                                    min={0}
                                    step={step}
                                    onChange={actions.handleTLOChange}
                                />
                                <span className="input-group-addon">{displayUnits}</span>
                            </div>
                        </div>
                    </div>
                    <div className="col-xs-6">
                        <div className="form-group">
                            <label className="control-label">{i18n._('Retraction Distance')}</label>
                            <div className="input-group input-group-xs">
                                <input
                                    type="number"
                                    className="form-control"
                                    value={retractionDistance}
                                    placeholder="0.00"
                                    min={0}
                                    step={step}
                                    onChange={actions.handleRetractionDistanceChange}
                                />
                                <span className="input-group-addon">{displayUnits}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="row no-gutters">
                    <div className="col-xs-12">
                        <div className="btn-toolbar">
                            <div className="btn-group" role="group">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default"
                                    onClick={actions.runZProbe}
                                    disabled={!canClick}
                                >
                                    {i18n._('Run Z-probe')}
                                </button>
                            </div>
                            <div className="btn-group" role="group"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default Probe;
