import _ from 'lodash';
import pubsub from 'pubsub-js';
import React from 'react';
import combokeys from '../../lib/combokeys';
import i18n from '../../lib/i18n';
import controller from '../../lib/controller';
import {
    WORKFLOW_STATE_RUNNING,
    WORKFLOW_STATE_PAUSED
} from '../../constants';
import styles from './index.styl';

class QuickAccessToolbar extends React.Component {
    actionHandlers = {
        CONTROLLER_COMMAND: (event, { command }) => {
            // feedhold, cyclestart, homing, unlock, reset
            controller.command(command);
        }
    };
    workflowState = controller.workflowState;
    pubsubTokens = [];

    componentDidMount() {
        _.each(this.actionHandlers, (callback, eventName) => {
            combokeys.on(eventName, callback);
        });
        this.subscribe();
    }
    componentWillUnmount() {
        this.unsubscribe();
        _.each(this.actionHandlers, (callback, eventName) => {
            combokeys.removeListener(eventName, callback);
        });
    }
    subscribe() {
        const tokens = [
            pubsub.subscribe('workflowState', (msg, workflowState) => {
                this.workflowState = workflowState;
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
    handleCycleStart() {
        if (this.workflowState === WORKFLOW_STATE_PAUSED) {
            pubsub.publish('workflowState', WORKFLOW_STATE_RUNNING);
        }
        controller.command('cyclestart');
    }
    handleFeedHold() {
        if (this.workflowState === WORKFLOW_STATE_RUNNING) {
            pubsub.publish('workflowState', WORKFLOW_STATE_PAUSED);
        }
        controller.command('feedhold');
    }
    handleHoming() {
        controller.command('homing');
    }
    handleSleep() {
        controller.command('sleep');
    }
    handleUnlock() {
        controller.command('unlock');
    }
    handleReset() {
        controller.command('reset');
    }
    render() {
        return (
            <div className={styles.quickAccessToolbar}>
                <ul className="nav navbar-nav">
                    <li className="btn-group btn-group-sm" role="group">
                        <button
                            type="button"
                            className="btn btn-default"
                            onClick={::this.handleCycleStart}
                            title={i18n._('Cycle Start')}
                        >
                            <i className="fa fa-repeat" />
                            <span className="space" />
                            {i18n._('Cycle Start')}
                        </button>
                        <button
                            type="button"
                            className="btn btn-default"
                            onClick={::this.handleFeedHold}
                            title={i18n._('Feedhold')}
                        >
                            <i className="fa fa-hand-paper-o" />
                            <span className="space" />
                            {i18n._('Feedhold')}
                        </button>
                    </li>
                    <li className="btn-group btn-group-sm" role="group">
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={::this.handleHoming}
                            title={i18n._('Homing')}
                        >
                            <i className="fa fa-home" />
                            <span className="space" />
                            {i18n._('Homing')}
                        </button>
                        <button
                            type="button"
                            className="btn btn-success"
                            onClick={::this.handleSleep}
                            title={i18n._('Sleep')}
                        >
                            <i className="fa fa-bed" />
                            <span className="space" />
                            {i18n._('Sleep')}
                        </button>
                        <button
                            type="button"
                            className="btn btn-warning"
                            onClick={::this.handleUnlock}
                            title={i18n._('Unlock')}
                        >
                            <i className="fa fa-unlock-alt" />
                            <span className="space" />
                            {i18n._('Unlock')}
                        </button>
                        <button
                            type="button"
                            className="btn btn-danger"
                            onClick={::this.handleReset}
                            title={i18n._('Reset')}
                        >
                            <i className="fa fa-undo" />
                            <span className="space" />
                            {i18n._('Reset')}
                        </button>
                    </li>
                </ul>
            </div>
        );
    }
}

export default QuickAccessToolbar;
