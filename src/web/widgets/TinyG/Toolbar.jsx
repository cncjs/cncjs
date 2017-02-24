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
                <div className="pull-right">
                    <DropdownButton
                        bsSize="xs"
                        bsStyle="default"
                        title={i18n._('More')}
                        id="tinyg-dropdown"
                        pullRight
                        disabled={!canClick}
                    >
                        <MenuItem onSelect={() => controller.writeln('?')} disabled={!canClick}>
                            {i18n._('Status Report (?)')}
                        </MenuItem>
                        <MenuItem
                            onSelect={() => {
                                controller.writeln('!%'); // queue flush
                                controller.writeln('{"qr":""}'); // queue report
                            }}
                            disabled={!canClick}
                        >
                            {i18n._('Queue Flush (%)')}
                        </MenuItem>
                        <MenuItem onSelect={() => controller.write('\x04')} disabled={!canClick}>
                            {i18n._('Kill Job (^d)')}
                        </MenuItem>
                        <MenuItem onSelect={() => controller.command('unlock')} disabled={!canClick}>
                            {i18n._('Clear Alarm ($clear)')}
                        </MenuItem>
                        <MenuItem divider />
                        <MenuItem onSelect={() => controller.writeln('h')} disabled={!canClick}>
                            {i18n._('Help')}
                        </MenuItem>
                        <MenuItem onSelect={() => controller.writeln('$sys')} disabled={!canClick}>
                            {i18n._('Show System Settings')}
                        </MenuItem>
                        <MenuItem onSelect={() => controller.writeln('$$')} disabled={!canClick}>
                            {i18n._('Show All Settings')}
                        </MenuItem>
                        <MenuItem onSelect={() => controller.writeln('?')} disabled={!canClick}>
                            {i18n._('Status Reports')}
                        </MenuItem>
                        <MenuItem onSelect={() => controller.writeln('$test')} disabled={!canClick}>
                            {i18n._('List Self Tests')}
                        </MenuItem>
                        <MenuItem divider />
                        <MenuItem onSelect={() => controller.writeln('$defa=1')} disabled={!canClick}>
                            {i18n._('Restore Defaults')}
                        </MenuItem>
                    </DropdownButton>
                </div>
            </div>
        );
    }
}

export default Toolbar;
