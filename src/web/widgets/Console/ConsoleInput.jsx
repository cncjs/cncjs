import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';
import shallowCompare from 'react-addons-shallow-compare';
import i18n from '../../lib/i18n';
import controller from '../../lib/controller';
import styles from './index.styl';

class ConsoleInput extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
    handleKeyDown(e) {
        const ENTER = 13;
        if (e.keyCode === ENTER) {
            this.handleSend();
        }
    }
    handleSend() {
        const el = ReactDOM.findDOMNode(this.node);

        if (el.value === '') {
            return;
        }

        controller.writeln(el.value);

        el.value = '';
    }
    render() {
        const { state, actions } = this.props;
        const { port } = state;
        const canClick = !!port;

        return (
            <div className={styles['console-input']}>
                <div className="input-group input-group-sm">
                    <input
                        ref={c => {
                            this.node = c;
                        }}
                        type="text"
                        className="form-control"
                        onKeyDown={::this.handleKeyDown}
                        placeholder={i18n._('Type serial port command')}
                        disabled={!canClick}
                    />
                    <div className="input-group-btn">
                        <button
                            type="button"
                            className="btn btn-default"
                            onClick={::this.handleSend}
                            disabled={!canClick}
                        >
                            {i18n._('Send')}
                        </button>
                        <button
                            type="button"
                            className="btn btn-default"
                            onClick={actions.clearAll}
                            disabled={!canClick}
                            title={i18n._('Clear all')}
                        >
                            <i className="fa fa-close" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }
}

export default ConsoleInput;
