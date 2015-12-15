import _ from 'lodash';
import i18n from 'i18next';
import pubsub from 'pubsub-js';
import React from 'react';
import serialport from '../../../lib/serialport';

class Spindle extends React.Component {
    state = {
        port: '',
        isCCWChecked: false,
        spindleSpeed: 0
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
    handleCCWChange() {
        this.setState({
            isCCWChecked: !(this.state.isCCWChecked)
        });
    }
    render() {
        let canClick = !!this.state.port;
        let cmd = this.state.isCCWChecked ? 'M4' : 'M3';
        let spindleSpeed = this.state.spindleSpeed;

        return (
            <div>
                <div className="btn-toolbar" role="toolbar">
                    <div className="btn-group btn-group-sm" role="group">
                        <button
                            type="button"
                            className="btn btn-default"
                            onClick={() => {
                                if (spindleSpeed > 0) {
                                    serialport.writeln(cmd + ' S' + spindleSpeed);
                                } else {
                                    serialport.writeln(cmd);
                                }
                            }}
                            title={i18n._('Start the spindle turning CW/CCW (M3/M4)')}
                            disabled={!canClick}
                        >
                            <i className="glyphicon glyphicon-play"></i>
                        </button>
                        <button
                            type="button"
                            className="btn btn-default"
                            onClick={() => serialport.writeln('M5')}
                            title={i18n._('Stop the spindle from turning (M5)')}
                            disabled={!canClick}
                        >
                            <i className="glyphicon glyphicon-stop"></i>
                        </button>
                    </div>
                </div>
                <div className="checkbox" >
                    <label>
                        <input type="checkbox" checked={this.state.isCCWChecked} onChange={::this.handleCCWChange} disabled={!canClick} />
                        &nbsp;{i18n._('Turn counterclockwise')}
                    </label>
                </div>
            </div>
        );
    }
}

export default Spindle;
