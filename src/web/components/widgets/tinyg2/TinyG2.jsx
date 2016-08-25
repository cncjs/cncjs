import _ from 'lodash';
import React, { Component, PropTypes } from 'react';
import CSSModules from 'react-css-modules';
import { ProgressBar } from 'react-bootstrap';
import mapGCodeToText from '../../../lib/gcode-text';
import i18n from '../../../lib/i18n';
import Panel from '../../common/Panel';
import Toggler from '../../common/Toggler';
import Toolbar from './Toolbar';
import {
    TINYG2_MACHINE_STATE_INIT,
    TINYG2_MACHINE_STATE_READY,
    TINYG2_MACHINE_STATE_ALARM,
    TINYG2_MACHINE_STATE_STOP,
    TINYG2_MACHINE_STATE_END,
    TINYG2_MACHINE_STATE_RUN,
    TINYG2_MACHINE_STATE_HOLD,
    TINYG2_MACHINE_STATE_PROBE,
    TINYG2_MACHINE_STATE_CYCLING,
    TINYG2_MACHINE_STATE_HOMING,
    TINYG2_MACHINE_STATE_JOGGING,
    TINYG2_MACHINE_STATE_SHUTDOWN
} from '../../../constants';
import styles from './index.styl';

@CSSModules(styles, { allowMultiple: true })
class TinyG2 extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    // See src/app/controllers/TinyG2/constants.js
    plannerBufferMax = 28; // default pool size
    plannerBufferMin = 8; // low water mark

    shouldComponentUpdate(nextProps, nextState) {
        return !_.isEqual(nextProps, this.props);
    }
    render() {
        const { state, actions } = this.props;
        const none = '–';
        const controllerState = state.controller.state;
        const machineState = _.get(controllerState, 'sr.machineState');
        const machineStateText = {
            [TINYG2_MACHINE_STATE_INIT]: i18n.t('controller:TinyG2.machineState.init'),
            [TINYG2_MACHINE_STATE_READY]: i18n.t('controller:TinyG2.machineState.ready'),
            [TINYG2_MACHINE_STATE_ALARM]: i18n.t('controller:TinyG2.machineState.alarm'),
            [TINYG2_MACHINE_STATE_STOP]: i18n.t('controller:TinyG2.machineState.stop'),
            [TINYG2_MACHINE_STATE_END]: i18n.t('controller:TinyG2.machineState.end'),
            [TINYG2_MACHINE_STATE_RUN]: i18n.t('controller:TinyG2.machineState.run'),
            [TINYG2_MACHINE_STATE_HOLD]: i18n.t('controller:TinyG2.machineState.hold'),
            [TINYG2_MACHINE_STATE_PROBE]: i18n.t('controller:TinyG2.machineState.probe'),
            [TINYG2_MACHINE_STATE_CYCLING]: i18n.t('controller:TinyG2.machineState.cycling'),
            [TINYG2_MACHINE_STATE_HOMING]: i18n.t('controller:TinyG2.machineState.homing'),
            [TINYG2_MACHINE_STATE_JOGGING]: i18n.t('controller:TinyG2.machineState.jogging'),
            [TINYG2_MACHINE_STATE_SHUTDOWN]: i18n.t('controller:TinyG2.machineState.shutdown')
        }[machineState];
        const plannerBuffer = _.get(controllerState, 'qr') || 0;
        const feedrate = _.get(controllerState, 'sr.feedrate');
        const velocity = _.get(controllerState, 'sr.velocity');
        const line = _.get(controllerState, 'sr.line');
        const modal = _.mapValues(_.get(controllerState, 'sr.modal', {}), (word, group) => mapGCodeToText(word));
        const panel = state.panel;

        let plannerBufferStyle = 'default';
        this.plannerBufferMin = Math.min(this.plannerBufferMin, plannerBuffer);
        this.plannerBufferMax = Math.max(this.plannerBufferMax, plannerBuffer);
        if (plannerBuffer > 0 && plannerBuffer === this.plannerBufferMin) {
            plannerBufferStyle = 'warning';
        }

        return (
            <div>
                <Toolbar {...this.props} styleName="toolbar" />
                <Panel styleName="panel">
                    <Panel.Heading styleName="panel-heading">
                        <Toggler
                            className="clearfix"
                            onToggle={() => {
                                actions.toggleQueueReports();
                            }}
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
                                    bsStyle={plannerBufferStyle}
                                    min={this.plannerBufferMin}
                                    max={this.plannerBufferMax}
                                    now={plannerBuffer}
                                    label={plannerBuffer > 0 ? plannerBuffer : ''}
                                />
                            </div>
                        </div>
                    </Panel.Body>
                }
                </Panel>
                <Panel styleName="panel">
                    <Panel.Heading styleName="panel-heading">
                        <Toggler
                            className="clearfix"
                            onToggle={() => {
                                actions.toggleStatusReports();
                            }}
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
                                <div styleName="well">{machineStateText || none}</div>
                            </div>
                        </div>
                        <div className="row no-gutters">
                            <div className="col col-xs-4">
                                {i18n._('Feed Rate')}
                            </div>
                            <div className="col col-xs-8">
                                <div styleName="well">{Number(feedrate) || 0}</div>
                            </div>
                        </div>
                        <div className="row no-gutters">
                            <div className="col col-xs-4">
                                {i18n._('Velocity')}
                            </div>
                            <div className="col col-xs-8">
                                <div styleName="well">{Number(velocity) || 0}</div>
                            </div>
                        </div>
                        <div className="row no-gutters">
                            <div className="col col-xs-4">
                                {i18n._('Line')}
                            </div>
                            <div className="col col-xs-8">
                                <div styleName="well">{Number(line) || 0}</div>
                            </div>
                        </div>
                    </Panel.Body>
                }
                </Panel>
                <Panel styleName="panel last">
                    <Panel.Heading styleName="panel-heading">
                        <Toggler
                            className="clearfix"
                            onToggle={() => {
                                actions.toggleModalGroups();
                            }}
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
                                <div styleName="well" title={modal.motion}>
                                    {modal.motion || none}
                                </div>
                            </div>
                        </div>
                        <div className="row no-gutters">
                            <div className="col col-xs-4">
                                {i18n._('Coordinate')}
                            </div>
                            <div className="col col-xs-8">
                                <div styleName="well" title={modal.coordinate}>
                                    {modal.coordinate || none}
                                </div>
                            </div>
                        </div>
                        <div className="row no-gutters">
                            <div className="col col-xs-4">
                                {i18n._('Plane')}
                            </div>
                            <div className="col col-xs-8">
                                <div styleName="well" title={modal.plane}>
                                    {modal.plane || none}
                                </div>
                            </div>
                        </div>
                        <div className="row no-gutters">
                            <div className="col col-xs-4">
                                {i18n._('Distance')}
                            </div>
                            <div className="col col-xs-8">
                                <div styleName="well" title={modal.distance}>
                                    {modal.distance || none}
                                </div>
                            </div>
                        </div>
                        <div className="row no-gutters">
                            <div className="col col-xs-4">
                                {i18n._('Feed Rate')}
                            </div>
                            <div className="col col-xs-8">
                                <div styleName="well" title={modal.feedrate}>
                                    {modal.feedrate || none}
                                </div>
                            </div>
                        </div>
                        <div className="row no-gutters">
                            <div className="col col-xs-4">
                                {i18n._('Units')}
                            </div>
                            <div className="col col-xs-8">
                                <div styleName="well" title={modal.units}>
                                    {modal.units || none}
                                </div>
                            </div>
                        </div>
                        <div className="row no-gutters" styleName="last">
                            <div className="col col-xs-4">
                                {i18n._('Path')}
                            </div>
                            <div className="col col-xs-8">
                                <div styleName="well" title={modal.path}>
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

export default TinyG2;
