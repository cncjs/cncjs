import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import ensureArray from '../../lib/ensure-array';
import mapGCodeToText from '../../lib/gcode-text';
import i18n from '../../lib/i18n';
import Panel from '../../components/Panel';
import Toggler from '../../components/Toggler';
import Overrides from './Overrides';
import styles from './index.styl';

class Marlin extends PureComponent {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    render() {
        const { state, actions } = this.props;
        const none = '–';
        const panel = state.panel;
        const controllerState = state.controller.state || {};
        const ovF = _.get(controllerState, 'ovF', 0);
        const ovS = _.get(controllerState, 'ovS', 0);
        const modal = _.mapValues(controllerState.modal || {}, mapGCodeToText);

        return (
            <div>
                <Overrides ovF={ovF} ovS={ovS} />
                <Panel className={styles.panel}>
                    <Panel.Heading className={styles.panelHeading}>
                        <Toggler
                            className="clearfix"
                            onToggle={() => {
                                actions.toggleModalGroups();
                            }}
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
                                <div className={styles.textEllipsis} title={i18n._('Motion')}>
                                    {i18n._('Motion')}
                                </div>
                            </div>
                            <div className="col col-xs-8">
                                <div className={styles.well} title={modal.motion}>
                                    {modal.motion || none}
                                </div>
                            </div>
                        </div>
                        <div className="row no-gutters">
                            <div className="col col-xs-4">
                                <div className={styles.textEllipsis} title={i18n._('Coordinate')}>
                                    {i18n._('Coordinate')}
                                </div>
                            </div>
                            <div className="col col-xs-8">
                                <div className={styles.well} title={modal.wcs}>
                                    {modal.wcs || none}
                                </div>
                            </div>
                        </div>
                        <div className="row no-gutters">
                            <div className="col col-xs-4">
                                <div className={styles.textEllipsis} title={i18n._('Plane')}>
                                    {i18n._('Plane')}
                                </div>
                            </div>
                            <div className="col col-xs-8">
                                <div className={styles.well} title={modal.plane}>
                                    {modal.plane || none}
                                </div>
                            </div>
                        </div>
                        <div className="row no-gutters">
                            <div className="col col-xs-4">
                                <div className={styles.textEllipsis} title={i18n._('Distance')}>
                                    {i18n._('Distance')}
                                </div>
                            </div>
                            <div className="col col-xs-8">
                                <div className={styles.well} title={modal.distance}>
                                    {modal.distance || none}
                                </div>
                            </div>
                        </div>
                        <div className="row no-gutters">
                            <div className="col col-xs-4">
                                <div className={styles.textEllipsis} title={i18n._('Feed Rate')}>
                                    {i18n._('Feed Rate')}
                                </div>
                            </div>
                            <div className="col col-xs-8">
                                <div className={styles.well} title={modal.feedrate}>
                                    {modal.feedrate || none}
                                </div>
                            </div>
                        </div>
                        <div className="row no-gutters">
                            <div className="col col-xs-4">
                                <div className={styles.textEllipsis} title={i18n._('Units')}>
                                    {i18n._('Units')}
                                </div>
                            </div>
                            <div className="col col-xs-8">
                                <div className={styles.well} title={modal.units}>
                                    {modal.units || none}
                                </div>
                            </div>
                        </div>
                        <div className="row no-gutters">
                            <div className="col col-xs-4">
                                <div className={styles.textEllipsis} title={i18n._('Program')}>
                                    {i18n._('Program')}
                                </div>
                            </div>
                            <div className="col col-xs-8">
                                <div className={styles.well} title={modal.program}>
                                    {modal.program || none}
                                </div>
                            </div>
                        </div>
                        <div className="row no-gutters">
                            <div className="col col-xs-4">
                                <div className={styles.textEllipsis} title={i18n._('Spindle')}>
                                    {i18n._('Spindle')}
                                </div>
                            </div>
                            <div className="col col-xs-8">
                                <div className={styles.well} title={modal.spindle}>
                                    {modal.spindle || none}
                                </div>
                            </div>
                        </div>
                        <div className="row no-gutters">
                            <div className="col col-xs-4">
                                <div className={styles.textEllipsis} title={i18n._('Coolant')}>
                                    {i18n._('Coolant')}
                                </div>
                            </div>
                            <div className="col col-xs-8">
                                <div className={styles.well}>
                                    {ensureArray(modal.coolant).map(coolant => (
                                        <div title={coolant} key={coolant}>{coolant || none}</div>
                                    ))}
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

export default Marlin;
