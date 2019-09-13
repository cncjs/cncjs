import ensureArray from 'ensure-array';
import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import mapGCodeToText from 'app/lib/gcode-text';
import i18n from 'app/lib/i18n';
import Clickable from 'app/components/Clickable';
import FontAwesomeIcon from 'app/components/FontAwesomeIcon';
import { Container, Row, Col } from 'app/components/GridSystem';
import Panel from 'app/components/Panel';
import Overrides from './Overrides';
import styles from './index.styl';

class Smoothie extends PureComponent {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    render() {
        const { state, actions } = this.props;
        const none = '–';
        const panel = state.panel;
        const controllerState = state.controller.state || {};
        const parserState = _.get(controllerState, 'parserstate', {});
        const activeState = _.get(controllerState, 'status.activeState', none);
        const ovF = _.get(controllerState, 'status.ovF', 0);
        const ovS = _.get(controllerState, 'status.ovS', 0);
        const feedrate = _.get(parserState, 'feedrate', none);
        const spindle = _.get(parserState, 'spindle', none);
        const tool = _.get(parserState, 'tool', none);
        const modal = _.mapValues(parserState.modal || {}, mapGCodeToText);

        return (
            <Container fluid>
                <Overrides ovF={ovF} ovS={ovS} />
                <Panel className={styles.panel}>
                    <Panel.Heading className={styles.panelHeading}>
                        <Clickable
                            onClick={actions.toggleStatusReports}
                            style={{ width: '100%' }}
                        >
                            {({ hovered }) => (
                                <Row>
                                    <Col>{i18n._('Status Reports')}</Col>
                                    <Col width="auto">
                                        <FontAwesomeIcon
                                            icon={panel.statusReports.expanded ? 'chevron-up' : 'chevron-down' }
                                            fixedWidth
                                            style={{
                                                color: '#222',
                                                opacity: hovered ? 1 : 0.5,
                                            }}
                                        />
                                    </Col>
                                </Row>
                            )}
                        </Clickable>
                    </Panel.Heading>
                    {panel.statusReports.expanded && (
                        <Panel.Body>
                            <div className="row no-gutters">
                                <div className="col col-xs-4">
                                    <div className={styles.textEllipsis} title={i18n._('State')}>
                                        {i18n._('State')}
                                    </div>
                                </div>
                                <div className="col col-xs-8">
                                    <div className={styles.well}>
                                        {activeState}
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
                                    <div className={styles.well}>
                                        {feedrate}
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
                                    <div className={styles.well}>
                                        {spindle}
                                    </div>
                                </div>
                            </div>
                            <div className="row no-gutters">
                                <div className="col col-xs-4">
                                    <div className={styles.textEllipsis} title={i18n._('Tool Number')}>
                                        {i18n._('Tool Number')}
                                    </div>
                                </div>
                                <div className="col col-xs-8">
                                    <div className={styles.well}>
                                        {tool}
                                    </div>
                                </div>
                            </div>
                        </Panel.Body>
                    )}
                </Panel>
                <Panel className={styles.panel}>
                    <Panel.Heading className={styles.panelHeading}>
                        <Clickable
                            onClick={actions.toggleModalGroups}
                            style={{ width: '100%' }}
                        >
                            {({ hovered }) => (
                                <Row>
                                    <Col>{i18n._('Modal Groups')}</Col>
                                    <Col width="auto">
                                        <FontAwesomeIcon
                                            icon={panel.modalGroups.expanded ? 'chevron-up' : 'chevron-down' }
                                            fixedWidth
                                            style={{
                                                color: '#222',
                                                opacity: hovered ? 1 : 0.5,
                                            }}
                                        />
                                    </Col>
                                </Row>
                            )}
                        </Clickable>
                    </Panel.Heading>
                    {panel.modalGroups.expanded && (
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
                    )}
                </Panel>
            </Container>
        );
    }
}

export default Smoothie;
