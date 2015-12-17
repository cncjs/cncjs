import i18n from 'i18next';
import React from 'react';
import serialport from '../../lib/serialport';

class GrblQuickAccessToolbar extends React.Component {
    handleGrblHelp() {
        serialport.writeln('$');
    }
    handleGrblSettings() {
        serialport.writeln('$$');
    }
    handleReset() {
        serialport.write('\x18');
    }
    handleHome() {
        serialport.writeln('$H');
    }
    handleUnlock() {
        serialport.writeln('$X');
    }
    render() {
        return (
            <div className="grbl-quick-access-toolbar">
                <div className="btn-group btn-group-sm" role="group">
                    <button type="button" className="btn btn-default" onClick={::this.handleGrblHelp}>{i18n._('Grbl Help')}</button>
                    <button type="button" className="btn btn-default" onClick={::this.handleGrblSettings}>{i18n._('Grbl Settings')}</button>
                </div>
                <div className="btn-group btn-group-sm" role="group">
                    <button type="button" className="btn btn-success" onClick={::this.handleHome}><i className="ion-home"></i>&nbsp;{i18n._('Home')}</button>
                    <button type="button" className="btn btn-warning" onClick={::this.handleUnlock}><i className="ion-unlocked"></i>&nbsp;{i18n._('Unlock')}</button>
                    <button type="button" className="btn btn-danger" onClick={::this.handleReset}><i className="ion-reset"></i>&nbsp;{i18n._('Reset')}</button>
                </div>
            </div>
        );
    }
}

export default GrblQuickAccessToolbar;
