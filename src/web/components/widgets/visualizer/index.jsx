import _ from 'lodash';
import pubsub from 'pubsub-js';
import React, { Component } from 'react';
import Visualizer from './Visualizer';
import controller from '../../../lib/controller';
import i18n from '../../../lib/i18n';
import Widget from '../../widget';
import './index.styl';

class VisualizerWidget extends Component {
    controllerEvents = {
        'Grbl:state': (state) => {
            const { status } = { ...state };
            const { activeState } = status;

            if (this.state.activeState !== activeState) {
                this.setState({ activeState: activeState });
            }
        },
        'TinyG2:state': (state) => { // TODO
        }
    };
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
    getDefaultState() {
        return {
            port: controller.port,
            activeState: ''
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
