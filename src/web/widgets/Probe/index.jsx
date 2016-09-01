import _, { includes } from 'lodash';
import classNames from 'classnames';
import pubsub from 'pubsub-js';
import React, { Component, PropTypes } from 'react';
import CSSModules from 'react-css-modules';
import Widget from '../../components/Widget';
import i18n from '../../lib/i18n';
import { in2mm, mm2in } from '../../lib/units';
import controller from '../../lib/controller';
import store from '../../store';
import Probe from './Probe';
import {
    IMPERIAL_UNITS,
    METRIC_UNITS,
    GRBL,
    TINYG2,
    GRBL_ACTIVE_STATE_IDLE,
    GRBL_ACTIVE_STATE_RUN,
    TINYG2_MACHINE_STATE_READY,
    TINYG2_MACHINE_STATE_STOP,
    TINYG2_MACHINE_STATE_END,
    TINYG2_MACHINE_STATE_RUN,
    WORKFLOW_STATE_IDLE
} from '../../constants';
import styles from './index.styl';

const toUnits = (units, val) => {
    val = Number(val) || 0;
    if (units === IMPERIAL_UNITS) {
        val = mm2in(val).toFixed(4) * 1;
    }
    if (units === METRIC_UNITS) {
        val = val.toFixed(3) * 1;
    }

    return val;
};

@CSSModules(styles, { allowMultiple: true })
class ProbeWidget extends Component {
    static propTypes = {
        onDelete: PropTypes.func
    };
    static defaultProps = {
        onDelete: () => {}
    };

    controllerEvents = {
        'Grbl:state': (state) => {
            const { parserstate } = { ...state };
            const { modal = {} } = { ...parserstate };
            let units = this.state.units;
            let {
                probeDepth,
                probeFeedrate,
                tlo,
                retractionDistance
            } = store.get('widgets.probe');

            // Imperial
            if (modal.units === 'G20') {
                units = IMPERIAL_UNITS;
                probeDepth = mm2in(probeDepth).toFixed(4) * 1;
                probeFeedrate = mm2in(probeFeedrate).toFixed(4) * 1;
                tlo = mm2in(tlo).toFixed(4) * 1;
                retractionDistance = mm2in(retractionDistance).toFixed(4) * 1;
            }

            // Metric
            if (modal.units === 'G21') {
                units = METRIC_UNITS;
                probeDepth = Number(probeDepth).toFixed(3) * 1;
                probeFeedrate = Number(probeFeedrate).toFixed(3) * 1;
                tlo = Number(tlo).toFixed(3) * 1;
                retractionDistance = Number(retractionDistance).toFixed(3) * 1;
            }

            if (this.state.units !== units) {
                // Set `this.unitsDidChange` to true if the unit has changed
                this.unitsDidChange = true;
            }

            this.setState({
                units: units,
                controller: {
                    type: GRBL,
                    state: state
                },
                probeDepth: probeDepth,
                probeFeedrate: probeFeedrate,
                tlo: tlo,
                retractionDistance: retractionDistance
            });
        },
        'TinyG2:state': (state) => {
            const { sr } = { ...state };
            const { modal = {} } = sr;
            let units = this.state.units;
            let {
                probeDepth,
                probeFeedrate,
                tlo,
                retractionDistance
            } = store.get('widgets.probe');

            // Imperial
            if (modal.units === 'G20') {
                units = IMPERIAL_UNITS;
                probeDepth = mm2in(probeDepth).toFixed(4) * 1;
                probeFeedrate = mm2in(probeFeedrate).toFixed(4) * 1;
                tlo = mm2in(tlo).toFixed(4) * 1;
                retractionDistance = mm2in(retractionDistance).toFixed(4) * 1;
            }

            // Metric
            if (modal.units === 'G21') {
                units = METRIC_UNITS;
                probeDepth = Number(probeDepth).toFixed(3) * 1;
                probeFeedrate = Number(probeFeedrate).toFixed(3) * 1;
                tlo = Number(tlo).toFixed(3) * 1;
                retractionDistance = Number(retractionDistance).toFixed(3) * 1;
            }

            if (this.state.units !== units) {
                // Set `this.unitsDidChange` to true if the unit has changed
                this.unitsDidChange = true;
            }

            this.setState({
                units: units,
                controller: {
                    type: TINYG2,
                    state: state
                },
                probeDepth: probeDepth,
                probeFeedrate: probeFeedrate,
                tlo: tlo,
                retractionDistance: retractionDistance
            });
        }
    };
    unitsDidChange = false;
    pubsubTokens = [];

    constructor() {
        super();
        this.state = this.getDefaultState();
    }
    componentDidMount() {
        this.subscribe();
        this.addControllerEvents();
    }
    componentWillUnmount() {
        this.unsubscribe();
        this.removeControllerEvents();
    }
    shouldComponentUpdate(nextProps, nextState) {
        return !_.isEqual(nextProps, this.props) || !_.isEqual(nextState, this.state);
    }
    componentDidUpdate(prevProps, prevState) {
        // Do not save to store if the units did change between in and mm
        if (this.unitsDidChange) {
            this.unitsDidChange = false;
            return;
        }

        const { units, probeCommand } = this.state;
        let {
            probeDepth,
            probeFeedrate,
            tlo,
            retractionDistance
        } = this.state;

        if (units === IMPERIAL_UNITS) {
            probeDepth = in2mm(probeDepth);
            probeFeedrate = in2mm(probeFeedrate);
            tlo = in2mm(tlo);
            retractionDistance = in2mm(retractionDistance);
        }

        // To save in mm
        store.set('widgets.probe.probeCommand', probeCommand);
        store.set('widgets.probe.probeDepth', Number(probeDepth));
        store.set('widgets.probe.probeFeedrate', Number(probeFeedrate));
        store.set('widgets.probe.tlo', Number(tlo));
        store.set('widgets.probe.retractionDistance', Number(retractionDistance));
    }
    getDefaultState() {
        return {
            isCollapsed: false,
            isFullscreen: false,
            canClick: true, // Defaults to true
            port: controller.port,
            units: METRIC_UNITS,
            controller: {
                type: controller.type,
                state: controller.state
            },
            workflowState: controller.workflowState,
            probeCommand: store.get('widgets.probe.probeCommand'),
            probeDepth: toUnits(METRIC_UNITS, store.get('widgets.probe.probeDepth')),
            probeFeedrate: toUnits(METRIC_UNITS, store.get('widgets.probe.probeFeedrate')),
            tlo: toUnits(METRIC_UNITS, store.get('widgets.probe.tlo')),
            retractionDistance: toUnits(METRIC_UNITS, store.get('widgets.probe.retractionDistance'))
        };
    }
    subscribe() {
        const tokens = [
            pubsub.subscribe('port', (msg, port) => {
                port = port || '';

                if (port) {
                    this.setState({ port: port });
                } else {
                    const defaultState = this.getDefaultState();
                    this.setState({
                        ...defaultState,
                        port: ''
                    });
                }
            }),
            pubsub.subscribe('workflowState', (msg, workflowState) => {
                if (this.state.workflowState !== workflowState) {
                    this.setState({ workflowState: workflowState });
                }
            })
        ];
        this.pubsubTokens = this.pubsubTokens.concat(tokens);
    }
    unsubscribe() {
        _.each(this.pubsubTokens, (token) => {
            pubsub.unsubscribe(token);
        });
        this.pubsubTokens = [];
    }
    addControllerEvents() {
        _.each(this.controllerEvents, (callback, eventName) => {
            controller.on(eventName, callback);
        });
    }
    removeControllerEvents() {
        _.each(this.controllerEvents, (callback, eventName) => {
            controller.off(eventName, callback);
        });
    }
    canClick() {
        const { port, workflowState } = this.state;
        const controllerType = this.state.controller.type;
        const controllerState = this.state.controller.state;

        if (!port) {
            return false;
        }
        if (workflowState !== WORKFLOW_STATE_IDLE) {
            return false;
        }
        if (controllerType === GRBL) {
            const activeState = _.get(controllerState, 'status.activeState');
            const states = [
                GRBL_ACTIVE_STATE_IDLE,
                GRBL_ACTIVE_STATE_RUN
            ];
            if (!includes(states, activeState)) {
                return false;
            }
        }
        if (controllerType === TINYG2) {
            const machineState = _.get(controllerState, 'sr.machineState');
            const states = [
                TINYG2_MACHINE_STATE_READY,
                TINYG2_MACHINE_STATE_STOP,
                TINYG2_MACHINE_STATE_END,
                TINYG2_MACHINE_STATE_RUN
            ];
            if (!includes(states, machineState)) {
                return false;
            }
        }

        return true;
    }
    changeProbeCommand(value) {
        this.setState({ probeCommand: value });
    }
    handleProbeDepthChange(event) {
        const probeDepth = event.target.value;
        this.setState({ probeDepth });
    }
    handleProbeFeedrateChange(event) {
        const probeFeedrate = event.target.value;
        this.setState({ probeFeedrate });
    }
    handleTLOChange(event) {
        const tlo = event.target.value;
        this.setState({ tlo });
    }
    handleRetractionDistanceChange(event) {
        const retractionDistance = event.target.value;
        this.setState({ retractionDistance });
    }
    sendCommand(cmd, params) {
        const s = _.map(params, (value, letter) => String(letter + value)).join(' ');
        const gcode = (s.length > 0) ? (cmd + ' ' + s) : cmd;
        controller.command('gcode', gcode);
    }
    runZProbe() {
        const { probeCommand, probeDepth, probeFeedrate, tlo, retractionDistance } = this.state;
        const towardWorkpiece = _.includes(['G38.2', 'G38.3'], probeCommand);

        // Set relative distance mode
        this.sendCommand('G91');

        // Start Z-probing
        this.sendCommand(probeCommand, {
            Z: towardWorkpiece ? -probeDepth : probeDepth,
            F: probeFeedrate
        });

        // Set back to asolute distance mode
        this.sendCommand('G90');

        // Zero out work z axis
        this.sendCommand('G10', {
            L: 20,
            P: 1,
            Z: tlo
        });

        // Set relative distance mode
        this.sendCommand('G91');

        // Retract slightly from the touch plate
        this.sendCommand('G0', {
            Z: retractionDistance
        });

        // Set back to asolute distance mode
        this.sendCommand('G90');
    }
    render() {
        const { isCollapsed, isFullscreen } = this.state;
        const state = {
            ...this.state,
            canClick: this.canClick()
        };
        const actions = {
            runZProbe: ::this.runZProbe,
            changeProbeCommand: ::this.changeProbeCommand,
            handleProbeDepthChange: ::this.handleProbeDepthChange,
            handleProbeFeedrateChange: ::this.handleProbeFeedrateChange,
            handleTLOChange: ::this.handleTLOChange,
            handleRetractionDistanceChange: ::this.handleRetractionDistanceChange
        };

        return (
            <div {...this.props} data-ns="widgets/probe">
                <Widget fullscreen={isFullscreen}>
                    <Widget.Header>
                        <Widget.Title>{i18n._('Probe')}</Widget.Title>
                        <Widget.Controls>
                            <Widget.Button
                                type="toggle"
                                defaultValue={isCollapsed}
                                onClick={(event, val) => this.setState({ isCollapsed: !!val })}
                            />
                            <Widget.Button
                                type="fullscreen"
                                defaultValue={isFullscreen}
                                onClick={(event, val) => this.setState({ isFullscreen: !!val })}
                            />
                            <Widget.Button
                                type="delete"
                                onClick={(event) => this.props.onDelete()}
                            />
                        </Widget.Controls>
                    </Widget.Header>
                    <Widget.Content
                        styleName={classNames(
                            'widget-content',
                            { 'hidden': isCollapsed }
                        )}
                    >
                        <Probe
                            state={state}
                            actions={actions}
                        />
                    </Widget.Content>
                </Widget>
            </div>
        );
    }
}

export default ProbeWidget;
