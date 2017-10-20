import _ from 'lodash';
import Slider from 'rc-slider';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Panel from '../../components/Panel';
import Toggler from '../../components/Toggler';
import RepeatButton from '../../components/RepeatButton';
import controller from '../../lib/controller';
import i18n from '../../lib/i18n';
import {
    // Grbl
    GRBL,
    // Smoothie
    SMOOTHIE,
    // TinyG
    TINYG
} from '../../constants';
import styles from './index.styl';

class Laser extends PureComponent {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    getLaserIntensityScale() {
        const { state } = this.props;
        const controllerType = state.controller.type;
        const controllerState = state.controller.state || {};
        const controllerSettings = state.controller.settings || {};
        let scale = 0;

        if (controllerType === GRBL) {
            const ovS = _.get(controllerState, 'ov[2]', []);
            scale = Number(ovS) || 0;
        }
        if (controllerType === SMOOTHIE) {
            const ovS = _.get(controllerState, 'ovS');
            scale = Number(ovS) || 0;
        }
        if (controllerType === TINYG) {
            const ovS = _.get(controllerSettings, 'sso');
            scale = Math.round((Number(ovS) || 0) * 100);
        }

        return scale;
    }
    render() {
        const { state, actions } = this.props;
        const none = '–';
        const { canClick, panel, test } = state;
        const laserIntensityScale = this.getLaserIntensityScale();

        return (
            <div>
                <div className="form-group">
                    <label className="control-label">
                        {i18n._('Laser Intensity Control')}
                    </label>
                    <div className="row no-gutters">
                        <div className="col-xs-3">
                            <div className={styles.droDisplay}>
                                {laserIntensityScale ? laserIntensityScale + '%' : none}
                            </div>
                        </div>
                        <div className="col-xs-9">
                            <div className={styles.droBtnGroup}>
                                <div className="btn-group btn-group-sm" role="group">
                                    <RepeatButton
                                        className="btn btn-default"
                                        style={{ padding: 5 }}
                                        disabled={!canClick}
                                        onClick={() => {
                                            controller.command('override:spindle', 10);
                                        }}
                                    >
                                        <i className="fa fa-arrow-up fa-fw" />10%
                                    </RepeatButton>
                                    <RepeatButton
                                        className="btn btn-default"
                                        style={{ padding: 5 }}
                                        disabled={!canClick}
                                        onClick={() => {
                                            controller.command('override:spindle', -10);
                                        }}
                                    >
                                        <i className="fa fa-arrow-down fa-fw" />10%
                                    </RepeatButton>
                                    <RepeatButton
                                        className="btn btn-default"
                                        style={{ padding: 5 }}
                                        disabled={!canClick}
                                        onClick={() => {
                                            controller.command('override:spindle', 1);
                                        }}
                                    >
                                        <i className="fa fa-arrow-up fa-fw" />1%
                                    </RepeatButton>
                                    <RepeatButton
                                        className="btn btn-default"
                                        style={{ padding: 5 }}
                                        disabled={!canClick}
                                        onClick={() => {
                                            controller.command('override:spindle', -1);
                                        }}
                                    >
                                        <i className="fa fa-arrow-down fa-fw" />1%
                                    </RepeatButton>
                                    <button
                                        type="button"
                                        className="btn btn-default"
                                        style={{ padding: 5 }}
                                        disabled={!canClick}
                                        onClick={() => {
                                            controller.command('override:spindle', 0);
                                        }}
                                    >
                                        <i className="fa fa-undo fa-fw" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <Panel className={styles.panel}>
                    <Panel.Heading className={styles.panelHeading}>
                        <Toggler
                            className="clearfix"
                            onToggle={actions.toggleLaserTest}
                            title={panel.laserTest.expanded ? i18n._('Hide') : i18n._('Show')}
                        >
                            <div className="pull-left">{i18n._('Laser Test')}</div>
                            <Toggler.Icon
                                className="pull-right"
                                expanded={panel.laserTest.expanded}
                            />
                        </Toggler>
                    </Panel.Heading>
                    {panel.laserTest.expanded &&
                    <Panel.Body>
                        <div className="table-form" style={{ marginBottom: 15 }}>
                            <div className="table-form-row">
                                <div className="table-form-col table-form-col-label middle">
                                    {i18n._('Power (%)')}
                                </div>
                                <div className="table-form-col">
                                    <div className="text-center">{test.power}%</div>
                                    <Slider
                                        style={{ padding: 0 }}
                                        defaultValue={test.power}
                                        min={0}
                                        max={100}
                                        step={1}
                                        onChange={actions.changeLaserTestPower}
                                    />
                                </div>
                            </div>
                            <div className="table-form-row">
                                <div className="table-form-col table-form-col-label middle">
                                    {i18n._('Test duration')}
                                </div>
                                <div className="table-form-col">
                                    <div className="input-group input-group-sm" style={{ width: '100%' }}>
                                        <input
                                            type="number"
                                            className="form-control"
                                            style={{ borderRadius: 0 }}
                                            value={test.duration}
                                            min={0}
                                            step={1}
                                            onChange={actions.changeLaserTestDuration}
                                        />
                                        <span className="input-group-addon">{i18n._('ms')}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="table-form-row">
                                <div className="table-form-col table-form-col-label middle">
                                    {i18n._('Maximum value')}
                                </div>
                                <div className="table-form-col">
                                    <div className="input-group input-group-sm" style={{ width: '100%' }}>
                                        <span className="input-group-addon">S</span>
                                        <input
                                            type="number"
                                            className="form-control"
                                            style={{ borderRadius: 0 }}
                                            value={test.maxS}
                                            min={0}
                                            step={1}
                                            onChange={actions.changeLaserTestMaxS}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="btn-toolbar" role="toolbar">
                            <div className="btn-group" role="group">
                                <button
                                    type="button"
                                    className="btn btn-default"
                                    style={{ minWidth: 80 }}
                                    disabled={!canClick}
                                    onClick={actions.laserTestOn}
                                >
                                    {i18n._('Laser Test')}
                                </button>
                            </div>
                            <div className="btn-group" role="group">
                                <button
                                    type="button"
                                    className="btn btn-default"
                                    style={{ minWidth: 80 }}
                                    disabled={!canClick}
                                    onClick={actions.laserTestOff}
                                >
                                    {i18n._('Laser Off')}
                                </button>
                            </div>
                        </div>
                    </Panel.Body>
                    }
                </Panel>
            </div>
        );
    }
}

export default Laser;
