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

        return (
            <div className="btn-group btn-group-xs">
                <button
                    type="button"
                    className="btn btn-default"
                    onClick={() => controller.command('cyclestart')}
                    disabled={!canClick}
                >
                    <i className="fa fa-play" /> {i18n._('Cycle Start')}
                </button>
                <button
                    type="button"
                    className="btn btn-default"
                    onClick={() => controller.command('feedhold')}
                    disabled={!canClick}
                >
                    <i className="fa fa-pause" /> {i18n._('Feed Hold')}
                </button>
                <button
                    type="button"
                    className="btn btn-default"
                    onClick={() => controller.command('reset')}
                    disabled={!canClick}
                >
                    <i className="fa fa-undo" /> {i18n._('Reset')}
                </button>
                <DropdownButton
                    bsSize="xs"
                    bsStyle="default"
                    title=""
                    id="grbl-dropdown"
                    disabled={!canClick}
                >
                    <MenuItem onSelect={() => controller.writeln('h')} disabled={!canClick}>{i18n._('Help')}</MenuItem>
                    <MenuItem onSelect={() => controller.writeln('$')} disabled={!canClick}>{i18n._('Show Settings')}</MenuItem>
                    <MenuItem onSelect={() => controller.writeln('?')} disabled={!canClick}>{i18n._('Status Reports')}</MenuItem>
                    <MenuItem onSelect={() => controller.writeln('$test')} disabled={!canClick}>{i18n._('List Self Tests')}</MenuItem>

                    <MenuItem onSelect={() => controller.writeln('$home=1')} disabled={!canClick}>{i18n._('Run Homing Cycle')}</MenuItem>
                    <MenuItem divider />
                    <MenuItem onSelect={() => controller.writeln('$defa=1')} disabled={!canClick}>{i18n._('Restore Defaults')}</MenuItem>
                </DropdownButton>
            </div>
        );
    }
}

export default Toolbar;
