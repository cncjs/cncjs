import _ from 'lodash';
import i18n from '../../../lib/i18n';
import React from 'react';
import ReactDOM from 'react-dom';
import { DropdownButton, MenuItem } from 'react-bootstrap';
import serialport from '../../../lib/serialport';
import {
    GRBL_REALTIME_COMMANDS
} from './constants';

class ConsoleInput extends React.Component {
    static propTypes = {
        port: React.PropTypes.string,
        onClear: React.PropTypes.func
    };

    handleKeyDown(e) {
        let ENTER = 13;
        if (e.keyCode === ENTER) {
            this.handleSend();
        }
    }
    handleSend() {
        let el = ReactDOM.findDOMNode(this.refs.command);

        if (el.value === '') {
            return;
        }

        if (_.includes(GRBL_REALTIME_COMMANDS, el.value)) {
            serialport.write(el.value);
        } else {
            serialport.writeln(el.value);
        }

        el.value = '';
    }
    handleClear() {
        this.props.onClear();
    }
    render() {
        let { port } = this.props;
        let canInput = !!port;
        let canSend = canInput;
        let canClearAll = canInput;
        let canViewGrblHelp = canInput;
        let canViewGrblSettings = canInput;

        return (
            <div className="console-input">
                <div className="input-group input-group-sm">
                    <input
                        type="text"
                        className="form-control"
                        onKeyDown={::this.handleKeyDown}
                        ref="command"
                        placeholder={i18n._('Type serial port command')}
                        disabled={!canInput}
                    />
                    <div className="input-group-btn">
                        <button
                            type="button"
                            className="btn btn-default"
                            onClick={::this.handleSend}
                            disabled={!canSend}
                        >
                            {i18n._('Send')}
                        </button>
                        <DropdownButton bsSize="sm" title="" id="console-command-dropdown" pullRight>
                            <MenuItem onSelect={::this.handleClear} disabled={!canClearAll}>{i18n._('Clear all')}</MenuItem>
                        </DropdownButton>
                    </div>
                </div>
            </div>
        );
    }
}

export default ConsoleInput;
