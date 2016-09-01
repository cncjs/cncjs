import classNames from 'classnames';
import { isEqual } from 'lodash';
import React, { Component, PropTypes } from 'react';
import CSSModules from 'react-css-modules';
import { DropdownButton, MenuItem, Tooltip, OverlayTrigger } from 'react-bootstrap';
import i18n from '../../../lib/i18n';
import controller from '../../../lib/controller';
import styles from './index.styl';

const keypadTooltip = () => {
    const styles = {
        tooltip: {
            fontFamily: 'Consolas, Menlo, Monaco, Lucida Console, Liberation Mono, DejaVu Sans Mono, Bitstream Vera Sans Mono, Courier New, monospace, serif',
            padding: 5
        },
        container: {
            padding: 5
        },
        axisDirection: {
            marginRight: 10
        },
        divider: {
            borderTop: '1px solid #ccc',
            marginTop: 5,
            paddingTop: 5
        },
        kbd: {
            border: '1px solid #aaa',
            padding: '1px 4px',
            fontFamily: 'sans-serif',
            whiteSpace: 'nowrap'
        },
        icon: {
            minWidth: 10,
            textAlign: 'center'
        }
    };

    return (
        <Tooltip
            id="widget-axes-keypad-tooltip"
            style={styles.tooltip}
        >
            <div style={styles.container}>
                <div className="row no-gutters text-left">
                    <div className="col-xs-12">
                        <span style={styles.axisDirection}>X+</span>
                        <kbd style={styles.kbd}>
                            <i className="fa fa-angle-right" style={styles.icon} />
                        </kbd>
                        &nbsp;{i18n._('Right')}
                    </div>
                    <div className="col-xs-12">
                        <span style={styles.axisDirection}>X-</span>
                        <kbd style={styles.kbd}>
                            <i className="fa fa-angle-left" style={styles.icon} />
                        </kbd>
                        &nbsp;{i18n._('Left')}
                    </div>
                    <div className="col-xs-12">
                        <span style={styles.axisDirection}>Y+</span>
                        <kbd style={styles.kbd}>
                            <i className="fa fa-angle-up" style={styles.icon} />
                        </kbd>
                        &nbsp;{i18n._('Up')}
                    </div>
                    <div className="col-xs-12">
                        <span style={styles.axisDirection}>Y-</span>
                        <kbd style={styles.kbd}>
                            <i className="fa fa-angle-down" style={styles.icon} />
                        </kbd>
                        &nbsp;{i18n._('Down')}
                    </div>
                    <div className="col-xs-12">
                        <span style={styles.axisDirection}>Z+</span>
                        <kbd style={styles.kbd}>
                            <i className="fa fa-long-arrow-up" style={styles.icon} />
                        </kbd>
                        &nbsp;{i18n._('Page Up')}
                    </div>
                    <div className="col-xs-12">
                        <span style={styles.axisDirection}>Z-</span>
                        <kbd style={styles.kbd}>
                            <i className="fa fa-long-arrow-down" style={styles.icon} />
                        </kbd>
                        &nbsp;{i18n._('Page Down')}
                    </div>
                </div>
                <div className="row no-gutters">
                    <div style={styles.divider} />
                </div>
                <div className="row no-gutters">
                    <div className="col-xs-12">
                        <div className="table-form">
                            <div className="table-form-row">
                                <div className="table-form-col table-form-col-label">{i18n._('0.1x Move')}</div>
                                <div className="table-form-col">
                                    <kbd style={styles.kbd}>{i18n._('Alt')}</kbd>
                                </div>
                            </div>
                            <div className="table-form-row">
                                <div className="table-form-col table-form-col-label">{i18n._('10x Move')}</div>
                                <div className="table-form-col">
                                    <kbd style={styles.kbd}>{i18n._('⇧ Shift')}</kbd>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Tooltip>
    );
};

@CSSModules(styles)
class ToolbarButton extends Component {
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
        const { state, actions } = this.props;
        const { canClick, keypadJogging } = state;
        const wcs = actions.getWorkCoordinateSystem();

        return (
            <div className="clearfix" styleName="toolbar-button">
                <div className="btn-group pull-left">
                    <OverlayTrigger
                        overlay={keypadTooltip()}
                        placement="bottom"
                        delayShow={600}
                    >
                        <button
                            type="button"
                            className={classNames(
                                'btn',
                                'btn-xs',
                                'btn-default',
                                { 'btn-select': keypadJogging }
                            )}
                            onClick={actions.toggleKeypadJogging}
                            disabled={!canClick}
                        >
                            <i className="fa fa-keyboard-o" />
                            &nbsp;
                            {i18n._('Keypad')}
                        </button>
                    </OverlayTrigger>
                </div>
                <div className="btn-group pull-right">
                    <button
                        type="button"
                        className="btn btn-xs btn-default"
                        onClick={actions.toggleDisplayUnits}
                        disabled={!canClick}
                    >
                        {i18n._('in / mm')}
                    </button>
                    <DropdownButton
                        bsSize="xs"
                        bsStyle="default"
                        title="XYZ"
                        id="axes-dropdown"
                        pullRight
                        disabled={!canClick}
                    >
                        <MenuItem header>{i18n._('Temporary Offsets (G92)')}</MenuItem>
                        <MenuItem
                            eventKey="G92 X0 Y0 Z0"
                            onSelect={::this.handleSelect}
                            disabled={!canClick}
                        >
                            {i18n._('Zero Out Temporary Offsets (G92 X0 Y0 Z0)')}
                        </MenuItem>
                        <MenuItem
                            eventKey="G92.1 X0 Y0 Z0"
                            onSelect={::this.handleSelect}
                            disabled={!canClick}
                        >
                            {i18n._('Un-Zero Out Temporary Offsets (G92.1 X0 Y0 Z0)')}
                        </MenuItem>
                        <MenuItem divider />
                    {wcs === 'G54' &&
                        <MenuItem header>{i18n._('Work Coordinate System (G54)')}</MenuItem>
                    }
                    {wcs === 'G55' &&
                        <MenuItem header>{i18n._('Work Coordinate System (G55)')}</MenuItem>
                    }
                    {wcs === 'G56' &&
                        <MenuItem header>{i18n._('Work Coordinate System (G56)')}</MenuItem>
                    }
                    {wcs === 'G57' &&
                        <MenuItem header>{i18n._('Work Coordinate System (G57)')}</MenuItem>
                    }
                    {wcs === 'G58' &&
                        <MenuItem header>{i18n._('Work Coordinate System (G58)')}</MenuItem>
                    }
                    {wcs === 'G59' &&
                        <MenuItem header>{i18n._('Work Coordinate System (G59)')}</MenuItem>
                    }
                        <MenuItem
                            eventKey="G0 X0 Y0 Z0"
                            onSelect={::this.handleSelect}
                            disabled={!canClick}
                        >
                            {i18n._('Go To Work Zero (G0 X0 Y0 Z0)')}
                        </MenuItem>
                    {wcs === 'G54' &&
                        <MenuItem
                            eventKey="G10 L20 P1 X0 Y0 Z0"
                            onSelect={::this.handleSelect}
                            disabled={!canClick}
                        >
                            {i18n._('Zero Out Work Offsets (G10 L20 P1 X0 Y0 Z0)')}
                        </MenuItem>
                    }
                    {wcs === 'G55' &&
                        <MenuItem
                            eventKey="G10 L20 P2 X0 Y0 Z0"
                            onSelect={::this.handleSelect}
                            disabled={!canClick}
                        >
                            {i18n._('Zero Out Work Offsets (G10 L20 P2 X0 Y0 Z0)')}
                        </MenuItem>
                    }
                    {wcs === 'G56' &&
                        <MenuItem
                            eventKey="G10 L20 P3 X0 Y0 Z0"
                            onSelect={::this.handleSelect}
                            disabled={!canClick}
                        >
                            {i18n._('Zero Out Work Offsets (G10 L20 P3 X0 Y0 Z0)')}
                        </MenuItem>
                    }
                    {wcs === 'G57' &&
                        <MenuItem
                            eventKey="G10 L20 P4 X0 Y0 Z0"
                            onSelect={::this.handleSelect}
                            disabled={!canClick}
                        >
                            {i18n._('Zero Out Work Offsets (G10 L20 P4 X0 Y0 Z0)')}
                        </MenuItem>
                    }
                    {wcs === 'G58' &&
                        <MenuItem
                            eventKey="G10 L20 P5 X0 Y0 Z0"
                            onSelect={::this.handleSelect}
                            disabled={!canClick}
                        >
                            {i18n._('Zero Out Work Offsets (G10 L20 P5 X0 Y0 Z0)')}
                        </MenuItem>
                    }
                    {wcs === 'G59' &&
                        <MenuItem
                            eventKey="G10 L20 P6 X0 Y0 Z0"
                            onSelect={::this.handleSelect}
                            disabled={!canClick}
                        >
                            {i18n._('Zero Out Work Offsets (G10 L20 P6 X0 Y0 Z0)')}
                        </MenuItem>
                    }
                        <MenuItem divider />
                        <MenuItem header>{i18n._('Machine Coordinate System (G53)')}</MenuItem>
                        <MenuItem
                            eventKey="G53 G0 X0 Y0 Z0"
                            onSelect={::this.handleSelect}
                            disabled={!canClick}
                        >
                            {i18n._('Go To Machine Zero (G53 G0 X0 Y0 Z0)')}
                        </MenuItem>
                    </DropdownButton>
                </div>
            </div>
        );
    }
}

export default ToolbarButton;
