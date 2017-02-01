import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import { DropdownButton, MenuItem } from 'react-bootstrap';
import i18n from '../../lib/i18n';
import controller from '../../lib/controller';
import styles from './index.styl';

class Toolbar extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
    render() {
        const { state } = this.props;
        const { canClick } = state;

        return (
            <div className={styles.toolbar}>
                <div className="btn-group btn-group-xs">
                    <button
                        type="button"
                        className="btn btn-default"
                        title={i18n._('Feedhold (!)')}
                        onClick={() => controller.command('feedhold')}
                        disabled={!canClick}
                    >
                        !
                    </button>
                    <button
                        type="button"
                        className="btn btn-default"
                        title={i18n._('Cycle Start (~)')}
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
                        title={i18n._('Homing ($H)')}
                        onClick={() => controller.command('homing')}
                        disabled={!canClick}
                    >
                        $H
                    </button>
                    <button
                        type="button"
                        className="btn btn-default"
                        title={i18n._('Kill Alarm Lock ($X)')}
                        onClick={() => controller.command('unlock')}
                        disabled={!canClick}
                    >
                        $X
                    </button>
                    <button
                        type="button"
                        className="btn btn-default"
                        title={i18n._('Reset (^x)')}
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
                        pullRight
                        disabled={!canClick}
                    >
                        <MenuItem onSelect={() => controller.writeln('help')} disabled={!canClick}>{i18n._('Help')}</MenuItem>
                        <MenuItem onSelect={() => controller.writeln('$#')} disabled={!canClick}>{i18n._('View G-code Parameters ($#)')}</MenuItem>
                        <MenuItem onSelect={() => controller.writeln('$G')} disabled={!canClick}>{i18n._('View G-code Parser State ($G)')}</MenuItem>
                    </DropdownButton>
                </div>
            </div>
        );
    }
}

export default Toolbar;
