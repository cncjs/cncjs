import _ from 'lodash';
import React, { Component, PropTypes } from 'react';
import { DropdownButton, MenuItem } from 'react-bootstrap';
import i18n from '../../../lib/i18n';
import controller from '../../../lib/controller';

class Toolbar extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    shouldComponentUpdate(nextProps, nextState) {
        return !_.isEqual(nextProps, this.props);
    }
    render() {
        const { state, ...others } = this.props;
        const { canClick } = state;
        const styles = {
            button: {
                minWidth: 24
            }
        };

        return (
            <div {...others}>
                <div className="btn-group btn-group-xs">
                    <button
                        type="button"
                        className="btn btn-default"
                        title={i18n._('Feedhold (!)')}
                        style={styles.button}
                        onClick={() => controller.command('feedhold')}
                        disabled={!canClick}
                    >
                        !
                    </button>
                    <button
                        type="button"
                        className="btn btn-default"
                        title={i18n._('Cycle Start (~)')}
                        style={styles.button}
                        onClick={() => controller.command('cyclestart')}
                        disabled={!canClick}
                    >
                        ~
                    </button>
                    <button
                        type="button"
                        className="btn btn-default"
                        title={i18n._('Queue Flush (%)')}
                        style={styles.button}
                        onClick={() => controller.command('queueflush')}
                        disabled={!canClick}
                    >
                        %
                    </button>
                </div>
                <div className="btn-group btn-group-xs" style={{ marginLeft: 10 }}>
                    <button
                        type="button"
                        className="btn btn-default"
                        title={i18n._('Kill Job (^d)')}
                        style={styles.button}
                        onClick={() => controller.command('killjob')}
                        disabled={!canClick}
                    >
                        ^d
                    </button>
                    <button
                        type="button"
                        className="btn btn-default"
                        title={i18n._('Clear Alarm ($clear)')}
                        style={styles.button}
                        onClick={() => controller.command('unlock')}
                        disabled={!canClick}
                    >
                        $clear
                    </button>
                    <button
                        type="button"
                        className="btn btn-default"
                        title={i18n._('Reset (^x)')}
                        style={styles.button}
                        onClick={() => controller.command('reset')}
                        disabled={!canClick}
                    >
                        ^x
                    </button>
                </div>
                <div className="pull-right">
                    <DropdownButton
                        bsSize="xs"
                        bsStyle="default"
                        title={i18n._('More')}
                        id="tinyg2-dropdown"
                        pullRight
                        disabled={!canClick}
                    >
                        <MenuItem onSelect={() => controller.writeln('h')} disabled={!canClick}>{i18n._('Help')}</MenuItem>
                        <MenuItem onSelect={() => controller.writeln('$sys')} disabled={!canClick}>{i18n._('Show System Settings')}</MenuItem>
                        <MenuItem onSelect={() => controller.writeln('$$')} disabled={!canClick}>{i18n._('Show All Settings')}</MenuItem>
                        <MenuItem onSelect={() => controller.writeln('?')} disabled={!canClick}>{i18n._('Status Reports')}</MenuItem>
                        <MenuItem onSelect={() => controller.writeln('$test')} disabled={!canClick}>{i18n._('List Self Tests')}</MenuItem>

                        <MenuItem divider />
                        <MenuItem onSelect={() => controller.writeln('$defa=1')} disabled={!canClick}>{i18n._('Restore Defaults')}</MenuItem>
                    </DropdownButton>
                </div>
            </div>
        );
    }
}

export default Toolbar;
