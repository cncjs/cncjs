import React from 'react';
import { DropdownButton, MenuItem } from 'react-bootstrap';
import i18n from '../../../lib/i18n';
import serialport from '../../../lib/serialport';

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
                        onClick={() => serialport.write('~')}
                        disabled={!canClick}
                    >
                        <span className="code">~</span>&nbsp;{i18n._('Cycle Start')}
                    </button>
                    <button
                        type="button"
                        className="btn btn-default"
                        onClick={() => serialport.write('!')}
                        disabled={!canClick}
                    >
                        <span className="code">!</span>&nbsp;{i18n._('Feed Hold')}
                    </button>
                    <button
                        type="button"
                        className="btn btn-default"
                        onClick={() => serialport.write('\x18')}
                        disabled={!canClick}
                    >
                        <span className="code">Ctrl-X</span>&nbsp;{i18n._('Reset Grbl')}
                    </button>
                    <DropdownButton
                        bsSize="sm"
                        bsStyle="default"
                        title=""
                        id="grbl-dropdown"
                        disabled={!canClick}
                    >
                        <MenuItem onSelect={() => serialport.writeln('$')} disabled={!canClick}>{i18n._('Grbl Help ($)')}</MenuItem>
                        <MenuItem onSelect={() => serialport.writeln('$$')} disabled={!canClick}>{i18n._('Grbl Settings ($$)')}</MenuItem>
                        <MenuItem onSelect={() => serialport.writeln('$#')} disabled={!canClick}>{i18n._('View G-code Parameters ($#)')}</MenuItem>
                        <MenuItem onSelect={() => serialport.writeln('$G')} disabled={!canClick}>{i18n._('View G-code Parser State ($G)')}</MenuItem>
                        <MenuItem onSelect={() => serialport.writeln('$I')} disabled={!canClick}>{i18n._('View Build Info ($I)')}</MenuItem>
                        <MenuItem onSelect={() => serialport.writeln('$N')} disabled={!canClick}>{i18n._('View Startup Blocks ($N)')}</MenuItem>
                        <MenuItem divider />
                        <MenuItem onSelect={() => serialport.writeln('$C')} disabled={!canClick}>{i18n._('Check G-code Mode ($C)')}</MenuItem>
                        <MenuItem onSelect={() => serialport.writeln('$X')} disabled={!canClick}>{i18n._('Kill Alarm Lock ($X)')}</MenuItem>
                        <MenuItem onSelect={() => serialport.writeln('$H')} disabled={!canClick}>{i18n._('Run Homing Cycle ($H)')}</MenuItem>
                    </DropdownButton>
                </div>
            </div>
        );
    }
}

export default Toolbar;
