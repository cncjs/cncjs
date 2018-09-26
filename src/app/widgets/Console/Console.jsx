import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import i18n from '../../lib/i18n';
import Terminal from './Terminal';
import styles from './index.styl';

class Console extends PureComponent {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    terminal = null;

    render() {
        const { state, actions } = this.props;
        const { port } = state;

        if (!port) {
            return (
                <div className={styles.noSerialConnection}>
                    {i18n._('No serial connection')}
                </div>
            );
        }

        return (
            <Terminal
                ref={node => {
                    if (node) {
                        this.terminal = node;
                    }
                }}
                cols={state.terminal.cols}
                rows={state.terminal.rows}
                cursorBlink={state.terminal.cursorBlink}
                scrollback={state.terminal.scrollback}
                tabStopWidth={state.terminal.tabStopWidth}
                onData={actions.onTerminalData}
            />
        );
    }
}

export default Console;
