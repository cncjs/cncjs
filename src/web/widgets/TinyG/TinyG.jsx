import get from 'lodash/get';
import map from 'lodash/map';
import mapValues from 'lodash/mapValues';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import { ProgressBar } from 'react-bootstrap';
import mapGCodeToText from '../../lib/gcode-text';
import controller from '../../lib/controller';
import i18n from '../../lib/i18n';
import Panel from '../../components/Panel';
import Toggler from '../../components/Toggler';
import Controller from './Controller';
import { Button } from '../../components/Buttons';
import Overrides from './Overrides';
import {
    TINYG_MACHINE_STATE_INITIALIZING,
    TINYG_MACHINE_STATE_READY,
    TINYG_MACHINE_STATE_ALARM,
    TINYG_MACHINE_STATE_STOP,
    TINYG_MACHINE_STATE_END,
    TINYG_MACHINE_STATE_RUN,
    TINYG_MACHINE_STATE_HOLD,
    TINYG_MACHINE_STATE_PROBE,
    TINYG_MACHINE_STATE_CYCLE,
    TINYG_MACHINE_STATE_HOMING,
    TINYG_MACHINE_STATE_JOG,
    TINYG_MACHINE_STATE_INTERLOCK,
    TINYG_MACHINE_STATE_SHUTDOWN,
    TINYG_MACHINE_STATE_PANIC
} from '../../constants';
import {
    MODAL_CONTROLLER
} from './constants';
import styles from './index.styl';

class TinyG extends PureComponent {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    // See src/app/controllers/TinyG/constants.js
    plannerBufferMax = 28; // default pool size
    plannerBufferMin = 0;

    render() {
        const { state, actions } = this.props;
        const none = '–';
        const controllerState = state.controller.state;
        const controllerSettings = state.controller.settings;
        const { fv, mfo, mto, sso } = controllerSettings;
        // https://github.com/cncjs/cncjs/issues/160
        // Firmware | mfo | sso | mto
        // -------- | --- | --- | ----
        // 0.97     | No  | No  | No
        // 0.98     | No  | Yes | No
        // 0.99     | Yes | Yes | Yes
        const ovF = (fv >= 0.99) ? Math.round(mfo * 100) || 0 : 0;
        const ovS = (fv >= 0.98) ? Math.round(sso * 100) || 0 : 0;
        const ovT = (fv >= 0.99) ? Math.round(mto * 100) || 0 : 0;
        const pwr = get(controllerState, 'pwr');
        const machineState = get(controllerState, 'sr.machineState');
        const machineStateText = {
            [TINYG_MACHINE_STATE_INITIALIZING]: i18n.t('controller:TinyG.machineState.initializing'),
            [TINYG_MACHINE_STATE_READY]: i18n.t('controller:TinyG.machineState.ready'),
            [TINYG_MACHINE_STATE_ALARM]: i18n.t('controller:TinyG.machineState.alarm'),
            [TINYG_MACHINE_STATE_STOP]: i18n.t('controller:TinyG.machineState.stop'),
            [TINYG_MACHINE_STATE_END]: i18n.t('controller:TinyG.machineState.end'),
            [TINYG_MACHINE_STATE_RUN]: i18n.t('controller:TinyG.machineState.run'),
            [TINYG_MACHINE_STATE_HOLD]: i18n.t('controller:TinyG.machineState.hold'),
            [TINYG_MACHINE_STATE_PROBE]: i18n.t('controller:TinyG.machineState.probe'),
            [TINYG_MACHINE_STATE_CYCLE]: i18n.t('controller:TinyG.machineState.cycle'),
            [TINYG_MACHINE_STATE_HOMING]: i18n.t('controller:TinyG.machineState.homing'),
            [TINYG_MACHINE_STATE_JOG]: i18n.t('controller:TinyG.machineState.jog'),
            [TINYG_MACHINE_STATE_INTERLOCK]: i18n.t('controller:TinyG.machineState.interlock'),
            [TINYG_MACHINE_STATE_SHUTDOWN]: i18n.t('controller:TinyG.machineState.shutdown'),
            [TINYG_MACHINE_STATE_PANIC]: i18n.t('controller:TinyG.machineState.panic')
        }[machineState];
        const plannerBuffer = get(controllerState, 'qr') || 0;
        const feedrate = get(controllerState, 'sr.feedrate');
        const velocity = get(controllerState, 'sr.velocity');
        const line = get(controllerState, 'sr.line');
        const modal = mapValues(get(controllerState, 'sr.modal', {}), mapGCodeToText);
        const panel = state.panel;

        this.plannerBufferMax = Math.max(this.plannerBufferMax, plannerBuffer);

        return (
            <div>
                {state.modal.name === MODAL_CONTROLLER &&
                <Controller state={state} actions={actions} />
                }
                <Overrides ovF={ovF} ovS={ovS} ovT={ovT} />
                <Panel className={styles.panel}>
                    <Panel.Heading className={styles.panelHeading}>
                        <Toggler
                            className="clearfix"
                            onToggle={actions.togglePowerManagement}
                            title={panel.powerManagement.expanded ? i18n._('Hide') : i18n._('Show')}
                        >
                            <div className="pull-left">{i18n._('Power Management')}</div>
                            <Toggler.Icon
                                className="pull-right"
                                expanded={panel.powerManagement.expanded}
                            />
                        </Toggler>
                    </Panel.Heading>
                    {panel.powerManagement.expanded && pwr &&
                    <Panel.Body>
                        <div className="row no-gutters" style={{ marginBottom: 10 }}>
                            <div className="col col-xs-12">
                                <Button
                                    btnStyle="flat"
                                    onClick={() => {
                                        controller.command('energizeMotors:on');
                                    }}
                                >
                                    <i className="fa fa-flash" />
                                    {i18n._('Enable Motors')}
                                </Button>
                                <Button
                                    btnStyle="flat"
                                    onClick={() => {
                                        controller.command('energizeMotors:off');
                                    }}
                                >
                                    <i className="fa fa-remove" />
                                    {i18n._('Disable Motors')}
                                </Button>
                            </div>
                        </div>
                        {map(pwr, (value, key) => (
                            <div key={key} className="row no-gutters">
                                <div className="col col-xs-4">
                                    {i18n._('Motor {{n}}', { n: key })}
                                </div>
                                <div className="col col-xs-8">
                                    <ProgressBar
                                        style={{ marginBottom: 0 }}
                                        bsStyle="info"
                                        min={0}
                                        max={1}
                                        now={value}
                                        label={<span className={styles.progressbarLabel}>{value}</span>}
                                    />
                                </div>
                            </div>
                        ))}
                    </Panel.Body>
                    }
                </Panel>
                <Panel className={styles.panel}>
                    <Panel.Heading className={styles['panel-heading']}>
                        <Toggler
                            className="clearfix"
                            onToggle={actions.toggleQueueReports}
                            title={panel.queueReports.expanded ? i18n._('Hide') : i18n._('Show')}
                        >
                            <div className="pull-left">{i18n._('Queue Reports')}</div>
                            <Toggler.Icon
                                className="pull-right"
                                expanded={panel.queueReports.expanded}
                            />
                        </Toggler>
                    </Panel.Heading>
                    {panel.queueReports.expanded &&
                    <Panel.Body>
                        <div className="row no-gutters">
                            <div className="col col-xs-4">
                                {i18n._('Planner Buffer')}
                            </div>
                            <div className="col col-xs-8">
                                <ProgressBar
                                    style={{ marginBottom: 0 }}
                                    bsStyle="info"
                                    min={this.plannerBufferMin}
                                    max={this.plannerBufferMax}
                                    now={plannerBuffer}
                                    label={<span className={styles.progressbarLabel}>{plannerBuffer}</span>}
                                />
                            </div>
                        </div>
                    </Panel.Body>
                    }
                </Panel>
                <Panel className={styles.panel}>
                    <Panel.Heading className={styles['panel-heading']}>
                        <Toggler
                            className="clearfix"
                            onToggle={actions.toggleStatusReports}
                            title={panel.statusReports.expanded ? i18n._('Hide') : i18n._('Show')}
                        >
                            <div className="pull-left">{i18n._('Status Reports')}</div>
                            <Toggler.Icon
                                className="pull-right"
                                expanded={panel.statusReports.expanded}
                            />
                        </Toggler>
                    </Panel.Heading>
                    {panel.statusReports.expanded &&
                    <Panel.Body>
                        <div className="row no-gutters">
                            <div className="col col-xs-4">
                                {i18n._('State')}
                            </div>
                            <div className="col col-xs-8">
                                <div className={styles.well}>{machineStateText || none}</div>
                            </div>
                        </div>
                        <div className="row no-gutters">
                            <div className="col col-xs-4">
                                {i18n._('Feed Rate')}
                            </div>
                            <div className="col col-xs-8">
                                <div className={styles.well}>{Number(feedrate) || 0}</div>
                            </div>
                        </div>
                        <div className="row no-gutters">
                            <div className="col col-xs-4">
                                {i18n._('Velocity')}
                            </div>
                            <div className="col col-xs-8">
                                <div className={styles.well}>{Number(velocity) || 0}</div>
                            </div>
                        </div>
                        <div className="row no-gutters">
                            <div className="col col-xs-4">
                                {i18n._('Line')}
                            </div>
                            <div className="col col-xs-8">
                                <div className={styles.well}>{Number(line) || 0}</div>
                            </div>
                        </div>
                    </Panel.Body>
                    }
                </Panel>
                <Panel className={styles.panel}>
                    <Panel.Heading className={styles['panel-heading']}>
                        <Toggler
                            className="clearfix"
                            onToggle={actions.toggleModalGroups}
                            title={panel.modalGroups.expanded ? i18n._('Hide') : i18n._('Show')}
                        >
                            <div className="pull-left">{i18n._('Modal Groups')}</div>
                            <Toggler.Icon
                                className="pull-right"
                                expanded={panel.modalGroups.expanded}
                            />
                        </Toggler>
                    </Panel.Heading>
                    {panel.modalGroups.expanded &&
                    <Panel.Body>
                        <div className="row no-gutters">
                            <div className="col col-xs-4">
                                {i18n._('Motion')}
                            </div>
                            <div className="col col-xs-8">
                                <div className={styles.well} title={modal.motion}>
                                    {modal.motion || none}
                                </div>
                            </div>
                        </div>
                        <div className="row no-gutters">
                            <div className="col col-xs-4">
                                {i18n._('Coordinate')}
                            </div>
                            <div className="col col-xs-8">
                                <div className={styles.well} title={modal.coordinate}>
                                    {modal.coordinate || none}
                                </div>
                            </div>
                        </div>
                        <div className="row no-gutters">
                            <div className="col col-xs-4">
                                {i18n._('Plane')}
                            </div>
                            <div className="col col-xs-8">
                                <div className={styles.well} title={modal.plane}>
                                    {modal.plane || none}
                                </div>
                            </div>
                        </div>
                        <div className="row no-gutters">
                            <div className="col col-xs-4">
                                {i18n._('Distance')}
                            </div>
                            <div className="col col-xs-8">
                                <div className={styles.well} title={modal.distance}>
                                    {modal.distance || none}
                                </div>
                            </div>
                        </div>
                        <div className="row no-gutters">
                            <div className="col col-xs-4">
                                {i18n._('Feed Rate')}
                            </div>
                            <div className="col col-xs-8">
                                <div className={styles.well} title={modal.feedrate}>
                                    {modal.feedrate || none}
                                </div>
                            </div>
                        </div>
                        <div className="row no-gutters">
                            <div className="col col-xs-4">
                                {i18n._('Units')}
                            </div>
                            <div className="col col-xs-8">
                                <div className={styles.well} title={modal.units}>
                                    {modal.units || none}
                                </div>
                            </div>
                        </div>
                        <div className="row no-gutters">
                            <div className="col col-xs-4">
                                {i18n._('Path')}
                            </div>
                            <div className="col col-xs-8">
                                <div className={styles.well} title={modal.path}>
                                    {modal.path || none}
                                </div>
                            </div>
                        </div>
                    </Panel.Body>
                    }
                </Panel>
            </div>
        );
    }
}

export default TinyG;
