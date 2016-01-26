import _ from 'lodash';
import React from 'react';
import combokeys from '../../lib/combokeys';
import i18n from '../../lib/i18n';
import controller from '../../lib/controller';

class QuickAccessToolbar extends React.Component {
    actionHandlers = {
        'FEED_HOLD': () => {
            controller.command('feedhold');
        },
        'RESUME': () => {
            controller.command('cyclestart');
        },
        'HOMING': () => {
            controller.command('homing');
        },
        'UNLOCK': () => {
            controller.command('unlock');
        },
        'RESET': () => {
            controller.command('reset');
        }
    };

    componentDidMount() {
        _.each(this.actionHandlers, (callback, eventName) => {
            combokeys.on(eventName, callback);
        });
    }
    componentWillUnmount() {
        _.each(this.actionHandlers, (callback, eventName) => {
            combokeys.off(eventName, callback);
        });
    }
    handleCycleStart() {
        controller.command('cyclestart');
    }
    handleFeedHold() {
        controller.command('feedhold');
    }
    handleReset() {
        controller.command('reset');
    }
    handleHoming() {
        controller.command('homing');
    }
    handleUnlock() {
        controller.command('unlock');
    }
    render() {
        return (
            <div className="quick-access-toolbar">
                <div className="btn-group btn-group-sm" role="group">
                    <button type="button" className="btn btn-default" onClick={::this.handleCycleStart} title={i18n._('Cycle Start')}><i className="fa fa-play"></i>&nbsp;{i18n._('Cycle Start')}</button>
                    <button type="button" className="btn btn-default" onClick={::this.handleFeedHold} title={i18n._('Feed Hold')}><i className="fa fa-pause"></i>&nbsp;{i18n._('Feed Hold')}</button>
                </div>
                <div className="btn-group btn-group-sm" role="group">
                    <button type="button" className="btn btn-primary" onClick={::this.handleHoming} title={i18n._('Homing')}><i className="fa fa-home"></i>&nbsp;{i18n._('Homing')}</button>
                    <button type="button" className="btn btn-warning" onClick={::this.handleUnlock} title={i18n._('Unlock')}><i className="fa fa-unlock-alt"></i>&nbsp;{i18n._('Unlock')}</button>
                    <button type="button" className="btn btn-danger" onClick={::this.handleReset} title={i18n._('Reset')}><i className="fa fa-undo"></i>&nbsp;{i18n._('Reset')}</button>
                </div>
            </div>
        );
    }
}

export default QuickAccessToolbar;
