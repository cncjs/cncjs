import _ from 'lodash';
import i18n from 'i18next';
import pubsub from 'pubsub-js';
import React from 'react';
import classNames from 'classnames';
import Widget, { WidgetHeader, WidgetContent } from '../widget';
import log from '../../lib/log';
import socket from '../../socket';
import './grbl.css';

class Grbl extends React.Component {
    state = {
        port: ''
    }

    componentDidMount() {
        this.subscribe();
    }
    componentWillUnmount() {
        this.unsubscribe();
    }
    subscribe() {
        let that = this;

        this.pubsubTokens = [];

        { // port
            let token = pubsub.subscribe('port', (msg, port) => {
                port = port || '';
                that.setState({ port: port });
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
    write() {
        let port = this.state.port;
        if ( ! port) {
            return;
        }

        let args = Array.prototype.slice.call(arguments);

        socket.emit.apply(socket, ['serialport:write', port].concat(args));
    }
    handleFeedHold() {
        this.write('!');
    }
    handleCycleStart() {
        this.write('~');
    }
    handleResetGrbl() {
        this.write('\x18');
    }
    handleUnlockGrbl() {
        this.write('$X');
    }
    // To start the spindle turning clockwise at the currently programmed speed, program: M3.
    handleSpindleOnCW(speed) {
        if (_.isNumber(speed)) {
            this.writeline('M3 S' + speed);
        } else {
            this.writeline('M3');
        }
    }
    // To start the spindle turning counterclockwise at the currently programmed speed, program: M4.
    handleSpindleOnCCW(speed) {
        if (_.isNumber(speed)) {
            this.writeline('M4 S' + speed);
        } else {
            this.writeline('M4');
        }
    }
    // To stop the spindle from turning, program: M5.
    handleSpindleOff() {
        this.writeline('M5');
    }
    render() {
        let canClick = !!this.state.port;

        return (
            <div>
                <div className="form-group">
                    <label>{i18n._('Cycle control:')}</label>
                    <div className="btn-group btn-group-justified" role="group" aria-label="...">
                        <div className="btn-group" role="group">
                            <button type="button" className="btn btn-sm btn-danger" onClick={::this.handleFeedHold} disabled={! canClick}>
                                {i18n._('Feed Hold')}
                            </button>
                        </div>
                        <div className="btn-group" role="group">
                            <button type="button" className="btn btn-sm btn-primary" onClick={::this.handleCycleStart} disabled={! canClick}>
                                {i18n._('Cycle Start')}
                            </button>
                        </div>
                    </div>
                </div>
                <div className="form-group">
                    <label>{i18n._('Reset control:')}</label>
                    <div className="btn-group btn-group-justified" role="group" aria-label="...">
                        <div className="btn-group" role="group">
                            <button type="button" className="btn btn-sm btn-default" onClick={::this.handleResetGrbl} disabled={! canClick}>
                                {i18n._('Soft Reset Grbl')}
                            </button>
                        </div>
                        <div className="btn-group" role="group">
                            <button type="button" className="btn btn-sm btn-default" onClick={::this.handleUnlockGrbl} disabled={! canClick}>
                                {i18n._('Unlock Grbl')}
                            </button>
                        </div>
                    </div>
                </div>
                <div className="form-group">
                    <label>{i18n._('Spindle control:')}</label>
                    <div className="btn-group btn-group-justified" role="group" aria-label="...">
                        <div className="btn-group" role="group">
                            <button type="button" className="btn btn-sm btn-default" onClick={::this.handleSpindleOnCW} disabled={! canClick}>
                                {i18n._('On (CW)')}
                            </button>
                        </div>
                        <div className="btn-group" role="group">
                            <button type="button" className="btn btn-sm btn-default" onClick={::this.handleSpindleOnCCW} disabled={! canClick}>
                                {i18n._('On (CCW)')}
                            </button>
                        </div>
                        <div className="btn-group" role="group">
                            <button type="button" className="btn btn-sm btn-default" onClick={::this.handleSpindleOff} disabled={! canClick}>
                                {i18n._('Off')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default class GrblWidget extends React.Component {
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
            <div><i className="glyphicon glyphicon-wrench"></i>{i18n._('Grbl')}</div>
        );
        let toolbarButtons = [
            'toggle'
        ];
        let widgetContentClass = classNames(
            { 'hidden': this.state.isCollapsed }
        );

        return (
            <div data-component="Widgets/GrblWidget">
                <Widget width={width}>
                    <WidgetHeader
                        title={title}
                        toolbarButtons={toolbarButtons}
                        handleClick={::this.handleClick}
                    />
                    <WidgetContent className={widgetContentClass}>
                        <Grbl />
                    </WidgetContent>
                </Widget>
            </div>
        );
    }
}
