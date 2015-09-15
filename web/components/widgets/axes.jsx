import _ from 'lodash';
import i18n from 'i18next';
import React from 'react';
import classNames from 'classnames';
import Select from 'react-select';
import PressAndHoldButton from '../common/PressAndHoldButton';
import Widget from '../widget';
import store from '../../store';
import socket from '../../socket';
import log from '../../lib/log';
import './axes.css';
import { ButtonGroup, DropdownButton, MenuItem, Glyphicon } from 'react-bootstrap';

const IMPERIAL_UNIT = 'inch';
const METRIC_UNIT = 'mm';

// mm/min (or inch/min)
const FEEDRATE_MIN = 0;
const FEEDRATE_MAX = 1000;
const FEEDRATE_STEP = 10;
const FEEDRATE_DEFAULT = 250;

// mm (or inch)
const DISTANCE_MIN = 0;
const DISTANCE_MAX = 1000;
const DISTANCE_STEP = 0.1;
const DISTANCE_DEFAULT = 1.00;

class AxesDisplayPanel extends React.Component {
    state = {
        activeState: 'Idle', // Idle, Run, Hold, Door, Home, Alarm, Check
        machinePos: { // Machine position
            x: '0.000',
            y: '0.000',
            z: '0.000'
        },
        workingPos: { // Working position
            x: '0.000',
            y: '0.000',
            z: '0.000'
        }
    };

    componentDidMount() {
        var that = this;
        socket.on('grbl:current-status', function(data) {
            that.setState({
                activeState: data.activeState,
                machinePos: data.machinePos,
                workingPos: data.workingPos
            });
        });
    }
    convertPositionUnit(pos) {
        pos = Number(pos);
        if (this.props.unit === METRIC_UNIT) {
            pos = (pos / 1).toFixed(3);
        } else {
            pos = (pos / 25.4).toFixed(3);
        }
        return '' + pos;
    }
    render() {
        let unit = this.props.unit;
        let machinePos = _.mapValues(this.state.machinePos, (pos, axis) => {
            return this.convertPositionUnit(pos);
        }.bind(this));
        let workingPos = _.mapValues(this.state.workingPos, (pos, axis) => {
            return this.convertPositionUnit(pos);
        }.bind(this));

        return (
            <div className="row display-panel">
                <table className="table-bordered">
                    <thead>
                        <tr>
                            <th className="table-header">{i18n._('Axis')}</th>
                            <th className="table-header">{i18n._('Machine Position')}</th>
                            <th className="table-header">{i18n._('Working Position')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="axis-label">X</td>
                            <td className="axis-position">
                                <span className="integer-part">{machinePos.x.split('.')[0]}</span>
                                <span className="decimal-point">.</span>
                                <span className="fractional-part">{machinePos.x.split('.')[1]}</span>
                                <span className="dimension-unit">{unit}</span>
                            </td>
                            <td className="axis-position">
                                <span className="integer-part">{workingPos.x.split('.')[0]}</span>
                                <span className="decimal-point">.</span>
                                <span className="fractional-part">{workingPos.x.split('.')[1]}</span>
                                <span className="dimension-unit">{unit}</span>
                            </td>
                        </tr>
                        <tr>
                            <td className="axis-label">Y</td>
                            <td className="axis-position">
                                <span className="integer-part">{machinePos.y.split('.')[0]}</span>
                                <span className="decimal-point">.</span>
                                <span className="fractional-part">{machinePos.y.split('.')[1]}</span>
                                <span className="dimension-unit">{unit}</span>
                            </td>
                            <td className="axis-position">
                                <span className="integer-part">{workingPos.y.split('.')[0]}</span>
                                <span className="decimal-point">.</span>
                                <span className="fractional-part">{workingPos.y.split('.')[1]}</span>
                                <span className="dimension-unit">{unit}</span>
                            </td>
                        </tr>
                        <tr>
                            <td className="axis-label">Z</td>
                            <td className="axis-position">
                                <span className="integer-part">{machinePos.z.split('.')[0]}</span>
                                <span className="decimal-point">.</span>
                                <span className="fractional-part">{machinePos.z.split('.')[1]}</span>
                                <span className="dimension-unit">{unit}</span>
                            </td>
                            <td className="axis-position">
                                <span className="integer-part">{workingPos.z.split('.')[0]}</span>
                                <span className="decimal-point">.</span>
                                <span className="fractional-part">{workingPos.z.split('.')[1]}</span>
                                <span className="dimension-unit">{unit}</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    }
}

class AxesControlPanel extends React.Component {
    state = {
        feedrate: FEEDRATE_DEFAULT,
        distance: DISTANCE_DEFAULT
    };

    normalizeToRange(n, min, max) {
        return Math.min(Math.max(Number(n), min), max);
    }
    handleChangeForFeedrate(event) {
        this.setState({ feedrate: event.target.value });
    }
    increaseFeedrate() {
        let feedrate = Math.min(Number(this.state.feedrate) + FEEDRATE_STEP, FEEDRATE_MAX);
        this.setState({ feedrate: feedrate });
    }
    decreaseFeedrate() {
        let feedrate = Math.max(Number(this.state.feedrate) - FEEDRATE_STEP, FEEDRATE_MIN);
        this.setState({ feedrate: feedrate });
    }
    resetFeedrate() {
        this.setState({ feedrate: FEEDRATE_DEFAULT });
    }
    handleChangeForDistance(event) {
        this.setState({ distance: event.target.value });
    }
    increaseDistance() {
        let distance = Math.min(Number(this.state.distance) + DISTANCE_STEP, DISTANCE_MAX);
        this.setState({ distance: distance.toFixed(2) });
    }
    decreaseDistance() {
        let distance = Math.max(Number(this.state.distance) - DISTANCE_STEP, DISTANCE_MIN);
        this.setState({ distance: distance.toFixed(2) });
    }
    resetDistance() {
        this.setState({ distance: DISTANCE_DEFAULT });
    }
    writeline() {
        let port = this.props.port;
        if ( ! port) {
            return;
        }

        let args = Array.prototype.slice.call(arguments);

        socket.emit.apply(socket, ['serialport:writeline', port].concat(args));
    }
    jogForwardX() {
        let msg = [
            'G91',
            'G1 F' + this.state.feedrate + ' X' + this.state.distance,
            'G90'
        ].join('\n');
        this.writeline(msg);
    }
    jogBackwardX() {
        let msg = [
            'G91',
            'G1 F' + this.state.feedrate + ' X-' + this.state.distance,
            'G90'
        ].join('\n');
        this.writeline(msg);
    }
    jogForwardY() {
        let msg = [
            'G91',
            'G1 F' + this.state.feedrate + ' Y' + this.state.distance,
            'G90'
        ].join('\n');
        this.writeline(msg);
    }
    jogBackwardY() {
        let msg = [
            'G91',
            'G1 F' + this.state.feedrate + ' Y-' + this.state.distance,
            'G90'
        ].join('\n');
        this.writeline(msg);
    }
    jogForwardZ() {
        let msg = [
            'G91',
            'G1 F' + this.state.feedrate + ' Z' + this.state.distance,
            'G90'
        ].join('\n');
        this.writeline(msg);
    }
    jogBackwardZ() {
        let msg = [
            'G91',
            'G1 F' + this.state.feedrate + ' Z-' + this.state.distance,
            'G90'
        ].join('\n');
        this.writeline(msg);
    }
    handleGoToZero() {
        this.writeline('G0 X0 Y0 Z0');
    }
    handleGoToZeroX() {
        this.writeline('G0 X0');
    }
    handleGoToZeroY() {
        this.writeline('G0 Y0');
    }
    handleGoToZeroZ() {
        this.writeline('G0 Z0');
    }
    handleZeroOut() {
        this.writeline('G92 X0 Y0 Z0');
    }
    handleZeroOutX() {
        this.writeline('G92 X0');
    }
    handleZeroOutY() {
        this.writeline('G92 Y0');
    }
    handleZeroOutZ() {
        this.writeline('G92 Z0');
    }
    // experimental feature
    handleToggleUnit() {
        let unit;

        if (this.props.unit === METRIC_UNIT) {
            unit = IMPERIAL_UNIT;
            
            //this.writeline('G20'); // G20 specifies Imperial (inch) unit
        } else {
            unit = METRIC_UNIT;

            //this.writeline('G21'); // G21 specifies Metric (mm) unit
        }
        this.props.changeDisplayUnit(unit);
    }
    // TBD
    handleHomingSequence() {
    }
    render() {
        let feedrate = this.normalizeToRange(this.state.feedrate, FEEDRATE_MIN, FEEDRATE_MAX);
        let distance = this.normalizeToRange(this.state.distance, DISTANCE_MIN, DISTANCE_MAX);
        let title = <Glyphicon glyph="list" />;

        return (
            <div className="row control-panel">
                <div className="form-group">
                    <label className="control-label">
                        {i18n._('Feed rate (mm/min):')}
                    </label>
                    <div className="input-group input-group-sm">
                        <input type="number" className="form-control" min={FEEDRATE_MIN} max={FEEDRATE_MAX} step={FEEDRATE_STEP} value={feedrate} onChange={::this.handleChangeForFeedrate} />
                        <div className="input-group-btn">
                            <PressAndHoldButton type="button" className="btn btn-default" onClick={::this.increaseFeedrate}>
                                <span className="glyphicon glyphicon-plus"></span>
                            </PressAndHoldButton>
                            <PressAndHoldButton type="button" className="btn btn-default" onClick={::this.decreaseFeedrate}>
                                <span className="glyphicon glyphicon-minus"></span>
                            </PressAndHoldButton>
                            <button type="button" className="btn btn-default" onClick={::this.resetFeedrate}>{i18n._('Reset')}</button>
                        </div>
                    </div>
                </div>
                <div className="form-group">
                    <label className="control-label">
                        {i18n._('Distance (mm):')}
                    </label>
                    <div className="input-group input-group-sm">
                        <input type="number" className="form-control" min={DISTANCE_MIN} max={DISTANCE_MAX} step={DISTANCE_STEP} value={distance} onChange={::this.handleChangeForDistance} />
                        <div className="input-group-btn">
                            <PressAndHoldButton type="button" className="btn btn-default" onClick={::this.increaseDistance}>
                                <span className="glyphicon glyphicon-plus"></span>
                            </PressAndHoldButton>
                            <PressAndHoldButton type="button" className="btn btn-default" onClick={::this.decreaseDistance}>
                                <span className="glyphicon glyphicon-minus"></span>
                            </PressAndHoldButton>
                            <button type="button" className="btn btn-default" onClick={::this.resetDistance}>{i18n._('Reset')}</button>
                        </div>
                    </div>
                </div>
                <div className="form-group">
                    <table className="table-centered">
                        <tbody>
                            <tr>
                                <td className="jog-x">
                                    <button type="button" className="btn btn-default jog-x-minus" onClick={::this.jogBackwardX}>X-</button>
                                </td>
                                <td className="jog-y">
                                    <div className="btn-group-vertical">
                                        <button type="button" className="btn btn-primary jog-y-plus" onClick={::this.jogForwardY}>Y+<i className="icon ion-arrow-up"></i></button>
                                        <button type="button" className="btn btn-primary jog-y-minus" onClick={::this.jogBackwardY}>Y-<i className="icon ion-arrow-down"></i></button>
                                    </div>
                                </td>
                                <td className="jog-x">
                                    <button type="button" className="btn btn-default jog-x-plus" onClick={::this.jogForwardX}>X+</button>
                                </td>
                                <td className="jog-z">
                                    <div className="btn-group-vertical">
                                        <button type="button" className="btn btn-danger jog-z-plus" onClick={::this.jogForwardZ}>Z+</button>
                                        <button type="button" className="btn btn-danger jog-z-minus" onClick={::this.jogBackwardZ}>Z-</button>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <hr />
                <div className="form-group">
                    <div className="btn-group btn-group-sm" role="group">
                        <button type="button" className="btn btn-default" onClick={::this.handleGoToZero}>{i18n._('Go To Zero (G0)')}</button>
                        <button type="button" className="btn btn-default" onClick={::this.handleZeroOut}>{i18n._('Zero Out (G92)')}</button>

                        <ButtonGroup bsSize="sm">
                            <DropdownButton bsSize="sm" bsStyle="default" title={title} id="axes-control-dropdown" noCaret dropup pullRight>
                                <MenuItem onSelect={::this.handleToggleUnit}>{i18n._('Toggle inch/mm')}</MenuItem>
                                <MenuItem divider />
                                <MenuItem onSelect={::this.handleGoToZeroX}>{i18n._('Go To Zero On X Axis (G0 X0)')}</MenuItem>
                                <MenuItem onSelect={::this.handleZeroOutX}>{i18n._('Zero Out X Axis (G92 X0)')}</MenuItem>
                                <MenuItem divider />
                                <MenuItem onSelect={::this.handleGoToZeroY}>{i18n._('Go To Zero On Y Axis (G0 Y0)')}</MenuItem>
                                <MenuItem onSelect={::this.handleZeroOutY}>{i18n._('Zero Out Y Axis (G92 Y0)')}</MenuItem>
                                <MenuItem divider />
                                <MenuItem onSelect={::this.handleGoToZeroZ}>{i18n._('Go To Zero On Z Axis (G0 Z0)')}</MenuItem>
                                <MenuItem onSelect={::this.handleZeroOutZ}>{i18n._('Zero Out Z Axis (G92 Z0)')}</MenuItem>
                            </DropdownButton>
                        </ButtonGroup>
                    </div>
                </div>
            </div>
        );
    }
}

class Axes extends React.Component {
    state = {
        port: '',
        unit: METRIC_UNIT,
        isCollapsed: false
    };

    componentDidMount() {
        this.subscribeToEvents();
    }
    componentWillUnmount() {
        this.unsubscribeFromEvents();
    }
    subscribeToEvents() {
        let that = this;

        this.unsubscribe = store.subscribe(() => {
            let port = _.get(store.getState(), 'port');
            that.setState({ port: port });
        });
    }
    unsubscribeFromEvents() {
        this.unsubscribe();
    }
    changeDisplayUnit(unit) {
        this.setState({ unit: unit });
    }
    toggleExpandCollapse() {
        this.setState({
            isCollapsed: ! this.state.isCollapsed
        });
    }
    render() {
        let port = this.state.port;
        let classes = {
            icon: classNames(
                'glyphicon',
                { 'glyphicon-chevron-up': ! this.state.isCollapsed },
                { 'glyphicon-chevron-down': this.state.isCollapsed }
            )
        };

        return (
            <div className="container-fluid">
                <AxesDisplayPanel
                    unit={this.state.unit}
                />

                <div className="row toggle-expand-collapse noselect" onClick={::this.toggleExpandCollapse}>
                    <i className={classes.icon}></i>
                </div>

                {! this.state.isCollapsed &&
                <AxesControlPanel
                    port={port}
                    unit={this.state.unit}
                    changeDisplayUnit={::this.changeDisplayUnit}
                />
                }
            </div>
        );
    }
}

export default class AxesWidget extends React.Component {
    render() {
        var options = {
            width: 300,
            header: {
                title: (
                    <div><i className="glyphicon glyphicon-stats"></i>{i18n._('Axes')}</div>
                ),
                toolbar: {
                    buttons: [
                        'toggle'
                    ]
                }
            },
            content: (
                <div data-component="Widgets/AxesWidget">
                    <Axes />
                </div>
            )
        };
        return (
            <Widget options={options} />
        );
    }
}
