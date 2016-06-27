import _ from 'lodash';
import React, { Component } from 'react';
import Visualizer from './Visualizer';
import controller from '../../../lib/controller';
import i18n from '../../../lib/i18n';
import Widget from '../../widget';
import {
    ACTIVE_STATE_IDLE
} from './constants';
import './index.styl';

class VisualizerWidget extends Component {
    state = {
        activeState: ACTIVE_STATE_IDLE
    };
    controllerEvents = {
        'grbl:status': (data) => {
            const { activeState } = data;

            if (this.state.activeState !== activeState) {
                this.setState({ activeState: activeState });
            }
        }
    };

    componentDidMount() {
        this.addControllerEvents();
    }
    componentWillUnmount() {
        this.removeControllerEvents();
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
        const { activeState } = this.state;

        return (
            <div {...this.props} data-ns="widgets/visualizer">
                <Widget borderless={true}>
                    <Widget.Header fixed>
                        <Widget.Title>
                            {i18n._('Active state: {{activeState}}', { activeState })}
                        </Widget.Title>
                    </Widget.Header>
                    <Widget.Content>
                        <Visualizer />
                    </Widget.Content>
                </Widget>
            </div>
        );
    }
}

export default VisualizerWidget;
