import _ from 'lodash';
import i18n from 'i18next';
import pubsub from 'pubsub-js';
import React from 'react';
import { DropdownButton, MenuItem } from 'react-bootstrap';
import classNames from 'classnames';
import PressAndHold from '../common/PressAndHold';
import { Widget, WidgetHeader, WidgetContent } from '../widget';
import socket from '../../lib/socket';
import serialport from '../../lib/serialport';
import log from '../../lib/log';
import './axes.css';

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

// Grbl Active State
const ACTIVE_STATE_IDLE = 'Idle';
const ACTIVE_STATE_RUN = 'Run';
const ACTIVE_STATE_HOLD = 'Hold';
const ACTIVE_STATE_DOOR = 'Door';
const ACTIVE_STATE_HOME = 'Home';
const ACTIVE_STATE_ALARM = 'Alarm';
const ACTIVE_STATE_CHECK = 'Check';

class DisplayPanel extends React.Component {
    static propTypes = {
        port: React.PropTypes.string,
        unit: React.PropTypes.string,
        activeState: React.PropTypes.string,
        machinePos: React.PropTypes.object,
        workingPos: React.PropTypes.object
    }

    handleSendCommand(target, eventKey) {
        let cmd = eventKey;
        if (cmd) {
            serialport.writeln(cmd);
        }
    }
    convertPositionUnit(pos) {
        pos = Number(pos);
        if (this.props.unit === METRIC_UNIT) {
            pos = (pos / 1).toFixed(3);
        } else {
            pos = (pos / 25.4).toFixed(4);
        }
        return '' + pos;
    }
    render() {
        let { port, unit, activeState } = this.props;
        let machinePos = _.mapValues(this.props.machinePos, (pos, axis) => {
            return this.convertPositionUnit(pos);
        });
        let workingPos = _.mapValues(this.props.workingPos, (pos, axis) => {
            return this.convertPositionUnit(pos);
        });
        let canClick = (!!port && (activeState !== ACTIVE_STATE_RUN));

        return (
            <div className="container-fluid display-panel">
                <div className="row">
                    <div className="active-state">
                        {i18n._('Active state:')}&nbsp;{activeState}
                    </div>
                    <table className="table-bordered">
                        <thead>
                            <tr>
                                <th>{i18n._('Axis')}</th>
                                <th>{i18n._('Machine Position')}</th>
                                <th>{i18n._('Working Position')}</th>
                                <th>{i18n._('Action')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="axis-label">
                                    X
                                </td>
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
                                <td className="axis-control">
                                    <DropdownButton bsSize="xs" bsStyle="default" title="" id="axis-x-dropdown" pullRight>
                                        <MenuItem header>{i18n._('Temporary Offsets (G92)')}</MenuItem>
                                        <MenuItem eventKey='G92 X0' onSelect={::this.handleSendCommand} disabled={!canClick}>{i18n._('Zero Out Temporary X Axis (G92 X0)')}</MenuItem>
                                        <MenuItem eventKey='G92.1 X0' onSelect={::this.handleSendCommand} disabled={!canClick}>{i18n._('Un-Zero Out Temporary X Axis (G92.1 X0)')}</MenuItem>
                                        <MenuItem divider />
                                        <MenuItem header>{i18n._('Work Coordinate System (G54)')}</MenuItem>
                                        <MenuItem eventKey='G0 X0' onSelect={::this.handleSendCommand} disabled={!canClick}>{i18n._('Go To Work Zero On X Axis (G0 X0)')}</MenuItem>
                                        <MenuItem eventKey='G10 L2 P1 X0' onSelect={::this.handleSendCommand} disabled={!canClick}>{i18n._('Zero Out Work X Axis (G10 L2 P1 X0)')}</MenuItem>
                                        <MenuItem divider />
                                        <MenuItem header>{i18n._('Machine Coordinate System (G53)')}</MenuItem>
                                        <MenuItem eventKey='G53 G0 X0' onSelect={::this.handleSendCommand} disabled={!canClick}>{i18n._('Go To Machine Zero On X Axis (G53 G0 X0)')}</MenuItem>
                                    </DropdownButton>
                                </td>
                            </tr>
                            <tr>
                                <td className="axis-label">
                                    Y
                                </td>
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
                                <td className="axis-control">
                                    <DropdownButton bsSize="xs" bsStyle="default" title="" id="axis-y-dropdown" pullRight>
                                        <MenuItem header>{i18n._('Temporary Offsets (G92)')}</MenuItem>
                                        <MenuItem eventKey='G92 Y0' onSelect={::this.handleSendCommand} disabled={!canClick}>{i18n._('Zero Out Temporary Y Axis (G92 Y0)')}</MenuItem>
                                        <MenuItem eventKey='G92.1 Y0' onSelect={::this.handleSendCommand} disabled={!canClick}>{i18n._('Un-Zero Out Temporary Y Axis (G92.1 Y0)')}</MenuItem>
                                        <MenuItem divider />
                                        <MenuItem header>{i18n._('Work Coordinate System (G54)')}</MenuItem>
                                        <MenuItem eventKey='G0 Y0' onSelect={::this.handleSendCommand} disabled={!canClick}>{i18n._('Go To Work Zero On Y Axis (G0 Y0)')}</MenuItem>
                                        <MenuItem eventKey='G10 L2 P1 Y0' onSelect={::this.handleSendCommand} disabled={!canClick}>{i18n._('Zero Out Work Y Axis (G10 L2 P1 Y0)')}</MenuItem>
                                        <MenuItem divider />
                                        <MenuItem header>{i18n._('Machine Coordinate System (G53)')}</MenuItem>
                                        <MenuItem eventKey='G53 G0 Y0' onSelect={::this.handleSendCommand} disabled={!canClick}>{i18n._('Go To Machine Zero On Y Axis (G53 G0 Y0)')}</MenuItem>
                                    </DropdownButton>
                                </td>
                            </tr>
                            <tr>
                                <td className="axis-label">
                                    Z
                                </td>
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
                                <td className="axis-control">
                                    <DropdownButton bsSize="xs" bsStyle="default" title="" id="axis-z-dropdown" pullRight>
                                        <MenuItem header>{i18n._('Temporary Offsets (G92)')}</MenuItem>
                                        <MenuItem eventKey='G92 Z0' onSelect={::this.handleSendCommand} disabled={!canClick}>{i18n._('Zero Out Temporary Z Axis (G92 Z0)')}</MenuItem>
                                        <MenuItem eventKey='G92.1 Z0' onSelect={::this.handleSendCommand} disabled={!canClick}>{i18n._('Un-Zero Out Temporary Z Axis (G92.1 Z0)')}</MenuItem>
                                        <MenuItem divider />
                                        <MenuItem header>{i18n._('Work Coordinate System (G54)')}</MenuItem>
                                        <MenuItem eventKey='G0 Z0' onSelect={::this.handleSendCommand} disabled={!canClick}>{i18n._('Go To Work Zero On Z Axis (G0 Z0)')}</MenuItem>
                                        <MenuItem eventKey='G10 L2 P1 Z0' onSelect={::this.handleSendCommand} disabled={!canClick}>{i18n._('Zero Out Work Z Axis (G10 L2 P1 Z0)')}</MenuItem>
                                        <MenuItem divider />
                                        <MenuItem header>{i18n._('Machine Coordinate System (G53)')}</MenuItem>
                                        <MenuItem eventKey='G53 G0 Z0' onSelect={::this.handleSendCommand} disabled={!canClick}>{i18n._('Go To Machine Zero On X Axis (G53 G0 Z0)')}</MenuItem>
                                    </DropdownButton>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }
}

class JogJoystickControl extends React.Component {
    static propTypes = {
        port: React.PropTypes.string,
        unit: React.PropTypes.string,
        activeState: React.PropTypes.string,
        feedrate: React.PropTypes.number,
        distance: React.PropTypes.number
    };

    jogForwardX() {
        let { feedrate, distance } = this.props;
        serialport.writeln('G91');
        serialport.writeln('G1 F' + feedrate + ' X' + distance);
        serialport.writeln('G90');
    }
    jogBackwardX() {
        let { feedrate, distance } = this.props;
        serialport.writeln('G91');
        serialport.writeln('G1 F' + feedrate + ' X-' + distance);
        serialport.writeln('G90');
    }
    jogForwardY() {
        let { feedrate, distance } = this.props;
        serialport.writeln('G91');
        serialport.writeln('G1 F' + feedrate + ' Y' + distance);
        serialport.writeln('G90');
    }
    jogBackwardY() {
        let { feedrate, distance } = this.props;
        serialport.writeln('G91');
        serialport.writeln('G1 F' + feedrate + ' Y-' + distance);
        serialport.writeln('G90');
    }
    jogForwardZ() {
        let { feedrate, distance } = this.props;
        serialport.writeln('G91');
        serialport.writeln('G1 F' + feedrate + ' Z' + distance);
        serialport.writeln('G90');
    }
    jogBackwardZ() {
        let { feedrate, distance } = this.props;
        serialport.writeln('G91');
        serialport.writeln('G1 F' + feedrate + ' Z-' + distance);
        serialport.writeln('G90');
    }
    render() {
        let { port, activeState } = this.props;
        let canClick = (!!port && (activeState !== ACTIVE_STATE_RUN));

        return (
            <div>
                <table className="table-centered">
                    <tbody>
                        <tr>
                            <td className="jog-x">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-x-minus"
                                    onClick={::this.jogBackwardX}
                                    disabled={!canClick}
                                >
                                    X-
                                </button>
                            </td>
                            <td className="jog-y">
                                <div className="btn-group-vertical">
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-default jog-y-plus"
                                        onClick={::this.jogForwardY}
                                        disabled={!canClick}
                                    >
                                        Y+
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-default jog-y-minus"
                                        onClick={::this.jogBackwardY}
                                        disabled={!canClick}
                                    >
                                        Y-
                                    </button>
                                </div>
                            </td>
                            <td className="jog-x">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-x-plus"
                                    onClick={::this.jogForwardX}
                                    disabled={!canClick}
                                >
                                    X+
                                </button>
                            </td>
                            <td className="jog-z">
                                <div className="btn-group-vertical">
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-default jog-z-plus"
                                        onClick={::this.jogForwardZ}
                                        disabled={!canClick}
                                    >
                                        Z+
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-default jog-z-minus"
                                        onClick={::this.jogBackwardZ}
                                        disabled={!canClick}
                                    >
                                        Z-
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    }
}

class JogFeedrateControl extends React.Component {
    state = {
        feedrate: FEEDRATE_DEFAULT
    }
    static propTypes = {
        onChange: React.PropTypes.func
    };

    normalizeToRange(n, min, max) {
        if (n < min) {
            return min;
        }
        if (n > max) {
            return max;
        }
        return n;
    }
    handleChange(event) {
        let feedrate = event.target.value;
        this.setState({ feedrate: feedrate });
        this.props.onChange(feedrate);
    }
    increaseFeedrate() {
        let feedrate = Math.min(Number(this.state.feedrate) + FEEDRATE_STEP, FEEDRATE_MAX);
        this.setState({ feedrate: feedrate });
        this.props.onChange(feedrate);
    }
    decreaseFeedrate() {
        let feedrate = Math.max(Number(this.state.feedrate) - FEEDRATE_STEP, FEEDRATE_MIN);
        this.setState({ feedrate: feedrate });
        this.props.onChange(feedrate);
    }
    resetFeedrate() {
        let feedrate = FEEDRATE_DEFAULT;
        this.setState({ feedrate: feedrate });
        this.props.onChange(feedrate);
    }

    render() {
        let feedrate = this.normalizeToRange(this.state.feedrate, FEEDRATE_MIN, FEEDRATE_MAX);

        return (
            <div>
                <label className="control-label">
                    {i18n._('Feed rate (mm/min):')}
                </label>
                <div className="input-group input-group-xs">
                    <div className="input-group-btn">
                        <input
                            type="number"
                            className="form-control"
                            style={{width: 80}}
                            min={FEEDRATE_MIN}
                            max={FEEDRATE_MAX}
                            step={FEEDRATE_STEP}
                            value={feedrate}
                            onChange={::this.handleChange}
                        />
                        <PressAndHold className="btn btn-default" onClick={::this.increaseFeedrate}>
                            <span className="glyphicon glyphicon-plus"></span>
                        </PressAndHold>
                        <PressAndHold className="btn btn-default" onClick={::this.decreaseFeedrate}>
                            <span className="glyphicon glyphicon-minus"></span>
                        </PressAndHold>
                        <button type="button" className="btn btn-default" onClick={::this.resetFeedrate} title={i18n._('Reset')}>
                            <span className="glyphicon glyphicon-repeat horizontal-mirror"></span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }
}

class JogDistanceControl extends React.Component {
    state = {
        distance: DISTANCE_DEFAULT
    };
    static propTypes = {
        onChange: React.PropTypes.func
    };

    normalizeToRange(n, min, max) {
        if (n < min) {
            return min;
        }
        if (n > max) {
            return max;
        }
        return n;
    }
    handleChange(event) {
        let distance = event.target.value;
        this.setState({ distance: distance });
        this.props.onChange(distance);
    }
    increaseDistance() {
        let distance = Math.min(Number(this.state.distance) + DISTANCE_STEP, DISTANCE_MAX);
        this.setState({ distance: distance });
        this.props.onChange(distance);
    }
    decreaseDistance() {
        let distance = Math.max(Number(this.state.distance) - DISTANCE_STEP, DISTANCE_MIN);
        this.setState({ distance: distance });
        this.props.onChange(distance);
    }
    resetDistance() {
        let distance = DISTANCE_DEFAULT;
        this.setState({ distance: distance });
        this.props.onChange(distance);
    }
    render() {
        let distance = this.normalizeToRange(this.state.distance, DISTANCE_MIN, DISTANCE_MAX);

        return (
            <div>
                <label className="control-label">
                    {i18n._('Distance (mm):')}
                </label>
                <div className="input-group input-group-xs">
                    <div className="input-group-btn">
                        <input
                            type="number"
                            className="form-control"
                            style={{width: 80}}
                            min={DISTANCE_MIN}
                            max={DISTANCE_MAX}
                            step={DISTANCE_STEP}
                            value={distance}
                            onChange={::this.handleChange}
                        />
                        <PressAndHold className="btn btn-default" onClick={::this.increaseDistance}>
                            <span className="glyphicon glyphicon-plus"></span>
                        </PressAndHold>
                        <PressAndHold className="btn btn-default" onClick={::this.decreaseDistance}>
                            <span className="glyphicon glyphicon-minus"></span>
                        </PressAndHold>
                        <button type="button" className="btn btn-default" onClick={::this.resetDistance} title={i18n._('Reset')}>
                            <span className="glyphicon glyphicon-repeat horizontal-mirror"></span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }
}

class JogControlPanel extends React.Component {
    state = {
        distance: DISTANCE_DEFAULT,
        feedrate: FEEDRATE_DEFAULT
    };
    static propTypes = {
        port: React.PropTypes.string,
        unit: React.PropTypes.string,
        activeState: React.PropTypes.string
    };

    changeFeedrate(feedrate) {
        this.setState({ feedrate: feedrate });
    }
    changeDistance(distance) {
        this.setState({ distance: distance });
    }
    handleToggleUnit() {
        let unit;

        if (this.props.unit === METRIC_UNIT) {
            unit = IMPERIAL_UNIT;
            
            //serialport.writeln('G20'); // G20 specifies Imperial (inch) unit
        } else {
            unit = METRIC_UNIT;

            //serialport.writeln('G21'); // G21 specifies Metric (mm) unit
        }
        this.props.changeDisplayUnit(unit);
    }
    render() {
        let { port, unit, activeState } = this.props;
        let { feedrate, distance } = this.state;
        let canClick = (!!port && (activeState !== ACTIVE_STATE_RUN));
        let styles = {
            jogJoystickControl: {
                marginTop: 20
            },
            jogDistanceControl: {
                marginLeft: 10
            },
            jogFeedrateControl: {
                marginLeft: 10
            }
        };

        return (
            <div className="container-fluid control-panel">
                <div className="row">
                    <div className="col-sm-6">
                        <div style={styles.jogJoystickControl}>
                            <JogJoystickControl
                                port={port}
                                unit={unit}
                                activeState={activeState}
                                feedrate={feedrate}
                                distance={distance}
                            />
                        </div>
                    </div>
                    <div className="col-sm-6">
                        <div className="form-group" style={styles.jogDistanceControl}>
                            <JogDistanceControl onChange={::this.changeDistance} />
                        </div>
                        <div className="form-group" style={styles.jogFeedrateControl}>
                            <JogFeedrateControl onChange={::this.changeFeedrate} />
                        </div>
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
        activeState: ACTIVE_STATE_IDLE,
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
        this.subscribe();
        this.addSocketEvents();
    }
    componentWillUnmount() {
        this.unsubscribe();
        this.removeSocketEvents();
    }
    subscribe() {
        let that = this;

        this.pubsubTokens = [];

        { // port
            let token = pubsub.subscribe('port', (msg, port) => {
                port = port || '';
                that.setState({ port: port });

                if (!port) {
                    that.resetCurrentStatus();
                }
            });
            this.pubsubTokens.push(token);
        }
    }
    unsubscribe() {
        _.each(this.pubsubTokens, (token) => {
            pubsub.unsubscribe(token);
        });
        this.pubsubTokens = [];
    }
    addSocketEvents() {
        socket.on('grbl:current-status', ::this.socketOnGrblCurrentStatus);
    }
    removeSocketEvents() {
        socket.off('grbl:current-status', ::this.socketOnGrblCurrentStatus);
    }
    socketOnGrblCurrentStatus(data) {
        this.setState({
            activeState: data.activeState,
            machinePos: data.machinePos,
            workingPos: data.workingPos
        });
    }
    resetCurrentStatus() {
        this.setState({
            activeState: ACTIVE_STATE_IDLE,
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
        });
    }
    toggleDisplayUnit() {
        let unit;

        if (this.state.unit === METRIC_UNIT) {
            unit = IMPERIAL_UNIT;
            
            //serialport.writeln('G20'); // G20 specifies Imperial (inch) unit
        } else {
            unit = METRIC_UNIT;

            //serialport.writeln('G21'); // G21 specifies Metric (mm) unit
        }
        this.setState({ unit: unit });
    }
    handleSendCommand(target, eventKey) {
        let cmd = eventKey;
        if (cmd) {
            serialport.writeln(cmd);
        }
    }
    render() {
        let { port, unit, activeState, machinePos, workingPos } = this.state;
        let canClick = (!!port && (activeState !== ACTIVE_STATE_RUN));

        return (
            <div>
                <div className="toolbar-button btn-group">
                    <button type="button" className="btn btn-xs btn-default" onClick={::this.toggleDisplayUnit}>{i18n._('in / mm')}</button>
                    <DropdownButton bsSize="xs" bsStyle="default" title="XYZ" id="axes-dropdown" pullRight>
                        <MenuItem eventKey='G0 X0 Y0 Z0' onSelect={::this.handleSendCommand} disabled={!canClick}>{i18n._('Go To Work Zero (G0 X0 Y0 Z0)')}</MenuItem>
                        <MenuItem eventKey='G53 X0 Y0 Z0' onSelect={::this.handleSendCommand} disabled={!canClick}>{i18n._('Go To Machine Zero (G53 X0 Y0 Z0)')}</MenuItem>
                        <MenuItem divider />
                        <MenuItem eventKey='G92 X0 Y0 Z0' onSelect={::this.handleSendCommand} disabled={!canClick}>{i18n._('Zero Out Temporary Offsets (G92 X0 Y0 Z0)')}</MenuItem>
                        <MenuItem eventKey='G92.1 X0 Y0 Z0' onSelect={::this.handleSendCommand} disabled={!canClick}>{i18n._('Un-Zero Out Temporary Offsets (G92.1 X0 Y0 Z0)')}</MenuItem>
                    </DropdownButton>
                </div>

                <DisplayPanel
                    port={port}
                    unit={unit}
                    activeState={activeState}
                    machinePos={machinePos}
                    workingPos={workingPos}
                />

                <JogControlPanel
                    port={port}
                    unit={unit}
                    activeState={activeState}
                />
            </div>
        );
    }
}

class AxesWidget extends React.Component {
    state = {
        isCollapsed: false
    };

    handleClick(target, val) {
        if (target === 'toggle') {
            this.setState({
                isCollapsed: !!val
            });
        }
    }
    render() {
        let width = 360;
        let title = (
            <div><i className="glyphicon glyphicon-transfer"></i>{i18n._('Axes')}</div>
        );
        let toolbarButtons = [
            'toggle'
        ];
        let widgetContentClass = classNames(
            { 'hidden': this.state.isCollapsed }
        );

        return (
            <div data-component="Widgets/AxesWidget">
                <Widget width={width}>
                    <WidgetHeader
                        title={title}
                        toolbarButtons={toolbarButtons}
                        handleClick={::this.handleClick}
                    />
                    <WidgetContent className={widgetContentClass}>
                        <Axes />
                    </WidgetContent>
                </Widget>
            </div>
        );
    }
}

export default AxesWidget;
