import _ from 'lodash';
import pubsub from 'pubsub-js';
import React, { Component, PropTypes } from 'react';
import controller from '../../../lib/controller';
import Toolbar from './Toolbar';
import DisplayPanel from './DisplayPanel';
import ControlPanel from './ControlPanel';
import {
    IMPERIAL_UNIT,
    METRIC_UNIT
} from './constants';

class Axes extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    controllerEvents = {
        'grbl:status': (data) => {
            const { actions } = this.props;
            const { activeState, machinePos, workingPos } = data;

            actions.updateStatus({ activeState, machinePos, workingPos });
        },
        'grbl:parserstate': (parserstate) => {
            const { state, actions } = this.props;
            let unit = state.unit;

            // Imperial
            if (parserstate.modal.units === 'G20') {
                unit = IMPERIAL_UNIT;
            }

            // Metric
            if (parserstate.modal.units === 'G21') {
                unit = METRIC_UNIT;
            }

            if (unit !== state.unit) {
                actions.changeUnit(unit);
            }
        }
    };
    pubsubTokens = [];

    componentDidMount() {
        this.subscribe();
        this.addControllerEvents();
    }
    componentWillUnmount() {
        this.unsubscribe();
        this.removeControllerEvents();
    }
    shouldComponentUpdate(nextProps, nextState) {
        return !_.isEqual(nextProps, this.props);
    }
    subscribe() {
        const { actions } = this.props;

        { // port
            const token = pubsub.subscribe('port', (msg, port) => {
                port = port || '';
                actions.changePort(port);

                if (!port) {
                    actions.resetStatus();
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
    render() {
        return (
            <div>
                <Toolbar {...this.props} />
                <DisplayPanel {...this.props} />
                <ControlPanel {...this.props} />
            </div>
        );
    }
}

export default Axes;
