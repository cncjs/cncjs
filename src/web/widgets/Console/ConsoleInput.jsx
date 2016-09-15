import _ from 'lodash';
import React, { Component, PropTypes } from 'react';
import CSSModules from 'react-css-modules';
import ReactDOM from 'react-dom';
import { DropdownButton, MenuItem } from 'react-bootstrap';
import i18n from '../../lib/i18n';
import controller from '../../lib/controller';
import styles from './index.styl';

@CSSModules(styles)
class ConsoleInput extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    shouldComponentUpdate(nextProps, nextState) {
        return !_.isEqual(nextProps, this.props);
    }
    handleKeyDown(e) {
        const ENTER = 13;
        if (e.keyCode === ENTER) {
            this.handleSend();
        }
    }
    handleSend() {
        const el = ReactDOM.findDOMNode(this.refs.command);

        if (el.value === '') {
            return;
        }

        controller.writeln(el.value);

        el.value = '';
    }
    render() {
        const { state, actions } = this.props;
        const { port } = state;
        const canInput = !!port;
        const canSend = canInput;
        const canClearAll = canInput;

        return (
            <div styleName="console-input">
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
                        <DropdownButton
                            bsSize="sm"
                            title=""
                            id="console-command-dropdown"
                            pullRight
                        >
                            <MenuItem
                                onSelect={() => {
                                    actions.clearAll();
                                }}
                                disabled={!canClearAll}
                            >
                                {i18n._('Clear all')}
                            </MenuItem>
                        </DropdownButton>
                    </div>
                </div>
            </div>
        );
    }
}

export default ConsoleInput;
