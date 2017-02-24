import classNames from 'classnames';
import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import { DropdownButton, MenuItem } from 'react-bootstrap';
import i18n from '../../lib/i18n';
import controller from '../../lib/controller';
import styles from './index.styl';
import {
    MODAL_CONTROLLER_STATE
} from './constants';

class Toolbar extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
    render() {
        const { state, actions } = this.props;
        const { canClick } = state;

        return (
            <div className={styles.toolbar}>
                <div className="btn-group btn-group-xs">
                    <button
                        type="button"
                        className="btn btn-default"
                        onClick={() => {
                            actions.openModal(MODAL_CONTROLLER_STATE);
                        }}
                    >
                        <i className={classNames(styles.icon, styles.iconStatusReport)} />
                        <span className="space space-sm" />
                        {i18n._('Current State')}
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
                        <MenuItem onSelect={() => controller.write('?')} disabled={!canClick}>
                            {i18n._('Status Report (?)')}
                        </MenuItem>
                        <MenuItem onSelect={() => controller.writeln('$C')} disabled={!canClick}>
                            {i18n._('Check G-code Mode ($C)')}
                        </MenuItem>
                        <MenuItem onSelect={() => controller.command('homing')} disabled={!canClick}>
                            {i18n._('Homing ($H)')}
                        </MenuItem>
                        <MenuItem onSelect={() => controller.command('unlock')} disabled={!canClick}>
                            {i18n._('Kill Alarm Lock ($X)')}
                        </MenuItem>
                        <MenuItem onSelect={() => controller.command('sleep')} disabled={!canClick}>
                            {i18n._('Sleep ($SLP)')}
                        </MenuItem>
                        <MenuItem divider />
                        <MenuItem onSelect={() => controller.writeln('$')} disabled={!canClick}>
                            {i18n._('Help ($)')}
                        </MenuItem>
                        <MenuItem onSelect={() => controller.writeln('$$')} disabled={!canClick}>
                            {i18n._('Settings ($$)')}
                        </MenuItem>
                        <MenuItem onSelect={() => controller.writeln('$#')} disabled={!canClick}>
                            {i18n._('View G-code Parameters ($#)')}
                        </MenuItem>
                        <MenuItem onSelect={() => controller.writeln('$G')} disabled={!canClick}>
                            {i18n._('View G-code Parser State ($G)')}
                        </MenuItem>
                        <MenuItem onSelect={() => controller.writeln('$I')} disabled={!canClick}>
                            {i18n._('View Build Info ($I)')}
                        </MenuItem>
                        <MenuItem onSelect={() => controller.writeln('$N')} disabled={!canClick}>
                            {i18n._('View Startup Blocks ($N)')}
                        </MenuItem>
                    </DropdownButton>
                </div>
            </div>
        );
    }
}

export default Toolbar;
