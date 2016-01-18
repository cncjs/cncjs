import React from 'react';
import i18n from '../../lib/i18n';
import controller from '../../lib/controller';

class QuickAccessToolbar extends React.Component {
    handleCycleStart() {
        controller.command('resume');
    }
    handleFeedHold() {
        controller.command('pause');
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
                    <button type="button" className="btn btn-default" onClick={::this.handleCycleStart} title={i18n._('Cycle Start')}><i className="ion-loop"></i>{i18n._('Cycle Start')}</button>
                    <button type="button" className="btn btn-default" onClick={::this.handleFeedHold} title={i18n._('Feed Hold')}><i className="ion-pause"></i>{i18n._('Feed Hold')}</button>
                </div>
                <div className="btn-group btn-group-sm" role="group">
                    <button type="button" className="btn btn-primary" onClick={::this.handleHoming} title={i18n._('Homing')}><i className="ion-home"></i>{i18n._('Homing')}</button>
                    <button type="button" className="btn btn-warning" onClick={::this.handleUnlock} title={i18n._('Unlock')}><i className="ion-unlocked"></i>{i18n._('Unlock')}</button>
                    <button type="button" className="btn btn-danger" onClick={::this.handleReset} title={i18n._('Reset')}><i className="ion-refresh mirror"></i>{i18n._('Reset')}</button>
                </div>
            </div>
        );
    }
}

export default QuickAccessToolbar;
