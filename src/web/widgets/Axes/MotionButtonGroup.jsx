import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import { DropdownButton, MenuItem } from 'react-bootstrap';
import i18n from '../../lib/i18n';
import controller from '../../lib/controller';
import styles from './index.styl';

class MotionButtonGroup extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
    handleSelect(eventKey) {
        const data = eventKey;
        if (data) {
            controller.command('gcode', data);
        }
    }
    render() {
        const { state } = this.props;
        const { canClick } = state;

        return (
            <div className={styles['motion-controls']}>
                <div className="row no-gutters">
                    <div className="col-xs-12">
                        <DropdownButton
                            bsStyle="default"
                            title={i18n._('Predefined Position')}
                            id="predefined-position-dropdown"
                            pullRight
                            disabled={!canClick}
                        >
                            <MenuItem eventKey="G28" onSelect={::this.handleSelect} disabled={!canClick}>
                                {i18n._('Go To Predefined Position 1 (G28)')}
                            </MenuItem>
                            <MenuItem eventKey="G30" onSelect={::this.handleSelect} disabled={!canClick}>
                                {i18n._('Go To Predefined Position 2 (G30)')}
                            </MenuItem>
                            <MenuItem divider />
                            <MenuItem eventKey="G28.1" onSelect={::this.handleSelect} disabled={!canClick}>
                                {i18n._('Set Predefined Position 1 (G28.1)')}
                            </MenuItem>
                            <MenuItem eventKey="G30.1" onSelect={::this.handleSelect} disabled={!canClick}>
                                {i18n._('Set Predefined Position 2 (G30.1)')}
                            </MenuItem>
                        </DropdownButton>
                    </div>
                </div>
                <div className={styles['row-space']} />
                <div className="row no-gutters">
                    <div className="col-xs-12">
                        <button
                            type="button"
                            className="btn btn-sm btn-default"
                            onClick={() => controller.command('gcode', 'G0 X0 Y0 Z0')}
                            disabled={!canClick}
                        >
                            {i18n._('Go To Work Zero')}
                        </button>
                    </div>
                </div>
                <div className={styles['row-space']} />
                <div className="row no-gutters">
                    <div className="col-xs-12">
                        <button
                            type="button"
                            className="btn btn-sm btn-default"
                            onClick={() => controller.command('gcode', 'G53 G0 X0 Y0 Z0')}
                            disabled={!canClick}
                        >
                            {i18n._('Go To Machine Zero')}
                        </button>
                    </div>
                </div>
                <div className={styles['row-space']} />
            </div>
        );
    }
}

export default MotionButtonGroup;
