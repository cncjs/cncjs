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
        const { state } = this.props;
        const { canClick } = state;
        const styles = {
            button: {
                minWidth: 24
            }
        };

        return (
            <div>
                <div className="btn-group btn-group-xs">
                    <button
                        type="button"
                        className="btn btn-default"
                        title={i18n._('Feedhold')}
                        style={styles.button}
                        onClick={() => controller.command('feedhold')}
                        disabled={!canClick}
                    >
                        !
                    </button>
                    <button
                        type="button"
                        className="btn btn-default"
                        title={i18n._('Cycle Start')}
                        style={styles.button}
                        onClick={() => controller.command('cyclestart')}
                        disabled={!canClick}
                    >
                        ~
                    </button>
                </div>
                <div className="btn-group btn-group-xs" style={{ marginLeft: 10 }}>
                    <button
                        type="button"
                        className="btn btn-default"
                        title={i18n._('Kill Alarm Lock')}
                        style={styles.button}
                        onClick={() => controller.command('unlock')}
                        disabled={!canClick}
                    >
                        $X
                    </button>
                    <button
                        type="button"
                        className="btn btn-default"
                        title={i18n._('Check G-code Mode')}
                        style={styles.button}
                        onClick={() => controller.command('check')}
                        disabled={!canClick}
                    >
                        $C
                    </button>
                    <button
                        type="button"
                        className="btn btn-default"
                        title={i18n._('Reset')}
                        style={styles.button}
                        onClick={() => controller.command('reset')}
                        disabled={!canClick}
                    >
                        ^x
                    </button>
                </div>
                <div className="btn-group pull-right">
                    <DropdownButton
                        bsSize="xs"
                        bsStyle="default"
                        title={i18n._('More')}
                        id="grbl-dropdown"
                        disabled={!canClick}
                    >
                        <MenuItem onSelect={() => controller.writeln('$')} disabled={!canClick}>{i18n._('Help ($)')}</MenuItem>
                        <MenuItem onSelect={() => controller.writeln('$$')} disabled={!canClick}>{i18n._('Settings ($$)')}</MenuItem>
                        <MenuItem onSelect={() => controller.writeln('$#')} disabled={!canClick}>{i18n._('View G-code Parameters ($#)')}</MenuItem>
                        <MenuItem onSelect={() => controller.writeln('$G')} disabled={!canClick}>{i18n._('View G-code Parser State ($G)')}</MenuItem>
                        <MenuItem onSelect={() => controller.writeln('$I')} disabled={!canClick}>{i18n._('View Build Info ($I)')}</MenuItem>
                        <MenuItem onSelect={() => controller.writeln('$N')} disabled={!canClick}>{i18n._('View Startup Blocks ($N)')}</MenuItem>
                    </DropdownButton>
                </div>
            </div>
        );
    }
}

export default Toolbar;
