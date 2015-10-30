import _ from 'lodash';
import i18n from 'i18next';
import pubsub from 'pubsub-js';
import React from 'react';
import { DropdownButton, MenuItem } from 'react-bootstrap';
import Select from 'react-select';
import classNames from 'classnames';
import PressAndHold from '../common/PressAndHold';
import Widget, { WidgetHeader, WidgetContent } from '../widget';
import socket from '../../socket';
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

class ToolbarButton extends React.Component {
    static propTypes = {
        onClick: React.PropTypes.func
    };

    onClick(btn) {
        this.props.onClick(btn);
    }
    render() {
        return (
            <div className="toolbar-button btn-group">
                <button type="button" className="btn btn-xs btn-default" onClick={() => this.onClick('toggle-display-unit')}>{i18n._('in / mm')}</button>
            </div>
        );
    }
}

class DisplayPanel extends React.Component {
    static propTypes = {
        port: React.PropTypes.string,
        unit: React.PropTypes.string,
        activeState: React.PropTypes.string,
        machinePos: React.PropTypes.object,
        workingPos: React.PropTypes.object
    }

    writeln() {
        let port = this.props.port;
        if (!port) {
            return;
        }

        let args = Array.prototype.slice.call(arguments);
        socket.emit.apply(socket, ['serialport:writeln', port].concat(args));
    }
    handleGoToZeroX() {
        this.writeln('G0 X0');
    }
    handleGoToZeroY() {
        this.writeln('G0 Y0');
    }
    handleGoToZeroZ() {
        this.writeln('G0 Z0');
    }
    handleZeroOutX() {
        this.writeln('G92 X0');
    }
    handleUnZeroOutX() {
        this.writeln('G92.1 X0');
    }
    handleZeroOutY() {
        this.writeln('G92 Y0');
    }
    handleUnZeroOutY() {
        this.writeln('G92.1 Y0');
    }
    handleZeroOutZ() {
        this.writeln('G92 Z0');
    }
    handleUnZeroOutZ() {
        this.writeln('G92.1 Z0');
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
        }.bind(this));
        let workingPos = _.mapValues(this.props.workingPos, (pos, axis) => {
            return this.convertPositionUnit(pos);
        }.bind(this));
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
                                        <MenuItem onSelect={::this.handleGoToZeroX} disabled={!canClick}>{i18n._('Go To Zero On X Axis (G0 X0)')}</MenuItem>
                                        <MenuItem onSelect={::this.handleZeroOutX} disabled={!canClick}>{i18n._('Zero Out X Axis (G92 X0)')}</MenuItem>
                                        <MenuItem onSelect={::this.handleUnZeroOutX} disabled={!canClick}>{i18n._('Un-Zero Out X Axis (G92.1 X0)')}</MenuItem>
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
                                        <MenuItem onSelect={::this.handleGoToZeroY} disabled={!canClick}>{i18n._('Go To Zero On Y Axis (G0 Y0)')}</MenuItem>
                                        <MenuItem onSelect={::this.handleZeroOutY} disabled={!canClick}>{i18n._('Zero Out Y Axis (G92 Y0)')}</MenuItem>
                                        <MenuItem onSelect={::this.handleUnZeroOutY} disabled={!canClick}>{i18n._('Un-Zero Out Y Axis (G92.1 Y0)')}</MenuItem>
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
                                        <MenuItem onSelect={::this.handleGoToZeroZ} disabled={!canClick}>{i18n._('Go To Zero On Z Axis (G0 Z0)')}</MenuItem>
                                        <MenuItem onSelect={::this.handleZeroOutZ} disabled={!canClick}>{i18n._('Zero Out Z Axis (G92 Z0)')}</MenuItem>
                                        <MenuItem onSelect={::this.handleUnZeroOutZ} disabled={!canClick}>{i18n._('Un-Zero Out Z Axis (G92.1 Z0)')}</MenuItem>
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
        activeState: React.PropTypes.string,
        feedrate: React.PropTypes.number,
        distance: React.PropTypes.number
    };

    writeln() {
        let port = this.props.port;
        if (!port) {
            return;
        }

        let args = Array.prototype.slice.call(arguments);

        socket.emit.apply(socket, ['serialport:writeln', port].concat(args));
    }
    jogForwardX() {
        let msg = [
            'G91',
            'G1 F' + this.props.feedrate + ' X' + this.props.distance,
            'G90'
        ].join('\n');
        this.writeln(msg);
    }
    jogBackwardX() {
        let msg = [
            'G91',
            'G1 F' + this.props.feedrate + ' X-' + this.props.distance,
            'G90'
        ].join('\n');
        this.writeln(msg);
    }
    jogForwardY() {
        let msg = [
            'G91',
            'G1 F' + this.props.feedrate + ' Y' + this.props.distance,
            'G90'
        ].join('\n');
        this.writeln(msg);
    }
    jogBackwardY() {
        let msg = [
            'G91',
            'G1 F' + this.props.feedrate + ' Y-' + this.props.distance,
            'G90'
        ].join('\n');
        this.writeln(msg);
    }
    jogForwardZ() {
        let msg = [
            'G91',
            'G1 F' + this.props.feedrate + ' Z' + this.props.distance,
            'G90'
        ].join('\n');
        this.writeln(msg);
    }
    jogBackwardZ() {
        let msg = [
            'G91',
            'G1 F' + this.props.feedrate + ' Z-' + this.props.distance,
            'G90'
        ].join('\n');
        this.writeln(msg);
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
        return Math.min(Math.max(Number(n), min), max);
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
            <div className="form-group">
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
                            <span className="glyphicon glyphicon-reset"></span>
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
        return Math.min(Math.max(Number(n), min), max);
    }
    handleChange(event) {
        let distance = event.target.value;
        this.setState({ distance: distance });
        this.props.onChange(distance);
    }
    increaseDistance() {
        let distance = Math.min(Number(this.state.distance) + DISTANCE_STEP, DISTANCE_MAX);
        this.setState({ distance: distance.toFixed(2) });
        this.props.onChange(distance);
    }
    decreaseDistance() {
        let distance = Math.max(Number(this.state.distance) - DISTANCE_STEP, DISTANCE_MIN);
        this.setState({ distance: distance.toFixed(2) });
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
            <div className="form-group">
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
                            <span className="glyphicon glyphicon-reset"></span>
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
        activeState: React.PropTypes.string,
        port: React.PropTypes.string
    };

    changeFeedrate(feedrate) {
        this.setState({ feedrate: feedrate });
    }
    changeDistance(distance) {
        this.setState({ distance: distance });
    }
    writeln() {
        let port = this.props.port;
        if (!port) {
            return;
        }

        let args = Array.prototype.slice.call(arguments);

        socket.emit.apply(socket, ['serialport:writeln', port].concat(args));
    }
    handleGoToZero() {
        this.writeln('G0 X0 Y0 Z0');
    }
    handleZeroOut() {
        this.writeln('G92 X0 Y0 Z0');
    }
    handleUnZeroOut() {
        this.writeln('G92.1 X0 Y0 Z0');
    }
    // experimental feature
    handleToggleUnit() {
        let unit;

        if (this.props.unit === METRIC_UNIT) {
            unit = IMPERIAL_UNIT;
            
            //this.writeln('G20'); // G20 specifies Imperial (inch) unit
        } else {
            unit = METRIC_UNIT;

            //this.writeln('G21'); // G21 specifies Metric (mm) unit
        }
        this.props.changeDisplayUnit(unit);
    }
    render() {
        let { port, unit, activeState } = this.props;
        let { feedrate, distance } = this.state;
        let canClick = (!!port && (activeState !== ACTIVE_STATE_RUN));

        return (
            <div className="container-fluid control-panel">
                <div className="row">
                    <div className="col-sm-6">
                        <JogJoystickControl
                            port={port}
                            activeState={activeState}
                            feedrate={feedrate}
                            distance={distance}
                        />
                    </div>
                    <div className="col-sm-6">
                        <div className="btn-group-vertical">
                            <button
                                type="button"
                                className="btn btn-xs btn-default"
                                onClick={::this.handleGoToZero}
                                disabled={!canClick}
                            >
                                {i18n._('Go To Zero (G0)')}
                            </button>
                            <button
                                type="button"
                                className="btn btn-xs btn-default"
                                onClick={::this.handleZeroOut}
                                disabled={!canClick}
                            >
                                {i18n._('Zero Out (G92)')}
                            </button>
                            <button
                                type="button"
                                className="btn btn-xs btn-default"
                                onClick={::this.handleUnZeroOut}
                                disabled={!canClick}
                            >
                                {i18n._('Un-Zero Out (G92.1)')}
                            </button>
                        </div>
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-6">
                        <JogDistanceControl onChange={::this.changeDistance} />
                    </div>
                    <div className="col-sm-6">
                        <JogFeedrateControl onChange={::this.changeFeedrate} />
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
        },
        isCollapsed: false
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
            
            //this.writeln('G20'); // G20 specifies Imperial (inch) unit
        } else {
            unit = METRIC_UNIT;

            //this.writeln('G21'); // G21 specifies Metric (mm) unit
        }
        this.setState({ unit: unit });
    }
    toggleExpandCollapse() {
        this.setState({
            isCollapsed: !(this.state.isCollapsed)
        });
    }
    handleToolbarButtonClick(btn) {
        if (btn === 'toggle-display-unit') {
            this.toggleDisplayUnit();
        }
    }
    render() {
        let { port, unit, activeState, machinePos, workingPos, isCollapsed } = this.state;
        let classes = {
            icon: classNames(
                'glyphicon',
                { 'glyphicon-chevron-up': !isCollapsed },
                { 'glyphicon-chevron-down': isCollapsed }
            )
        };

        return (
            <div>
                <ToolbarButton onClick={::this.handleToolbarButtonClick} />

                <DisplayPanel
                    port={port}
                    unit={unit}
                    activeState={activeState}
                    machinePos={machinePos}
                    workingPos={workingPos}
                />

                <div className="container-fluid control-panel-toggler">
                    <div className="row">
                        <div className="toggle-expand-collapse noselect" onClick={::this.toggleExpandCollapse}>
                            <i className={classes.icon}></i>
                        </div>
                    </div>
                </div>

                {!isCollapsed &&
                <JogControlPanel
                    port={port}
                    unit={unit}
                    activeState={activeState}
                />
                }
            </div>
        );
    }
}

export default class AxesWidget extends React.Component {
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
            <div><i className="glyphicon glyphicon-move"></i>{i18n._('Axes')}</div>
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
