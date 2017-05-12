import PropTypes from 'prop-types';
import React from 'react';
import { DropdownButton, MenuItem } from 'react-bootstrap';
import i18n from '../../lib/i18n';
import controller from '../../lib/controller';
import styles from './index.styl';
import {
    MODAL_CONTROLLER_STATE,
    MODAL_CONTROLLER_SETTINGS
} from './constants';

const Toolbar = (props) => {
    const { state, actions } = props;
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
                    <i className="fa fa-bolt" />
                    <span className="space space-sm" />
                    {i18n._('Controller State')}
                </button>
                <button
                    type="button"
                    className="btn btn-default"
                    onClick={() => {
                        actions.openModal(MODAL_CONTROLLER_SETTINGS);
                    }}
                >
                    <i className="fa fa-cog" />
                    <span className="space space-sm" />
                    {i18n._('Controller Settings')}
                </button>
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
                    <MenuItem onSelect={() => controller.command('homing')} disabled={!canClick}>
                        {i18n._('Homing ($H)')}
                    </MenuItem>
                    <MenuItem onSelect={() => controller.command('unlock')} disabled={!canClick}>
                        {i18n._('Kill Alarm Lock ($X)')}
                    </MenuItem>
                    <MenuItem divider />
                    <MenuItem onSelect={() => controller.writeln('help')} disabled={!canClick}>
                        {i18n._('Help')}
                    </MenuItem>
                    <MenuItem onSelect={() => controller.writeln('$#')} disabled={!canClick}>
                        {i18n._('View G-code Parameters ($#)')}
                    </MenuItem>
                    <MenuItem onSelect={() => controller.writeln('$G')} disabled={!canClick}>
                        {i18n._('View G-code Parser State ($G)')}
                    </MenuItem>
                </DropdownButton>
            </div>
        </div>
    );
};

Toolbar.propTypes = {
    state: PropTypes.object,
    actions: PropTypes.object
};

export default Toolbar;
