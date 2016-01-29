import React from 'react';
import { DropdownButton, MenuItem } from 'react-bootstrap';
import i18n from '../../../lib/i18n';
import controller from '../../../lib/controller';

class Toolbar extends React.Component {
    static propTypes = {
        port: React.PropTypes.string
    };

    render() {
        let { port } = this.props;
        let canClick = !!port;

        return (
            <div>
                <div className="btn-group btn-group-sm">
                    <button type="button"
                        className="btn btn-default"
                        onClick={() => controller.write('~')}
                        disabled={!canClick}
                    >
                        {i18n._('Cycle Start')}
                    </button>
                    <button
                        type="button"
                        className="btn btn-default"
                        onClick={() => controller.write('!')}
                        disabled={!canClick}
                    >
                        {i18n._('Feed Hold')}
                    </button>
                    <button
                        type="button"
                        className="btn btn-default"
                        onClick={() => controller.write('\x18')}
                        disabled={!canClick}
                    >
                        {i18n._('Reset Grbl')}
                    </button>
                    <DropdownButton
                        bsSize="sm"
                        bsStyle="default"
                        title=""
                        id="grbl-dropdown"
                        disabled={!canClick}
                    >
                        <MenuItem onSelect={() => controller.writeln('$')} disabled={!canClick}>{i18n._('Grbl Help ($)')}</MenuItem>
                        <MenuItem onSelect={() => controller.writeln('$$')} disabled={!canClick}>{i18n._('Grbl Settings ($$)')}</MenuItem>
                        <MenuItem onSelect={() => controller.writeln('$#')} disabled={!canClick}>{i18n._('View G-code Parameters ($#)')}</MenuItem>
                        <MenuItem onSelect={() => controller.writeln('$G')} disabled={!canClick}>{i18n._('View G-code Parser State ($G)')}</MenuItem>
                        <MenuItem onSelect={() => controller.writeln('$I')} disabled={!canClick}>{i18n._('View Build Info ($I)')}</MenuItem>
                        <MenuItem onSelect={() => controller.writeln('$N')} disabled={!canClick}>{i18n._('View Startup Blocks ($N)')}</MenuItem>
                        <MenuItem divider />
                        <MenuItem onSelect={() => controller.writeln('$C')} disabled={!canClick}>{i18n._('Check G-code Mode ($C)')}</MenuItem>
                        <MenuItem onSelect={() => controller.writeln('$X')} disabled={!canClick}>{i18n._('Kill Alarm Lock ($X)')}</MenuItem>
                        <MenuItem onSelect={() => controller.writeln('$H')} disabled={!canClick}>{i18n._('Run Homing Cycle ($H)')}</MenuItem>
                    </DropdownButton>
                </div>
            </div>
        );
    }
}

export default Toolbar;
