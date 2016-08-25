import { isEqual } from 'lodash';
import React, { Component, PropTypes } from 'react';
import { DropdownButton, MenuItem } from 'react-bootstrap';
import CSSModules from 'react-css-modules';
import i18n from '../../../lib/i18n';
import controller from '../../../lib/controller';
import styles from './index.styl';

@CSSModules(styles)
class MotionButtonGroup extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    shouldComponentUpdate(nextProps, nextState) {
        return !isEqual(nextProps, this.props);
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
            <div styleName="motion-controls">
                <div className="row no-gutters">
                    <div className="col-xs-12">
                        <DropdownButton
                            bsSize="sm"
                            bsStyle="default"
                            title={
                                <span><i className="fa fa-h-square"></i>&nbsp;{i18n._('Predefined Position')}</span>
                            }
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
                <div styleName="row-space" />
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
                <div styleName="row-space" />
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
                <div styleName="row-space" />
            </div>
        );
    }
}

export default MotionButtonGroup;
