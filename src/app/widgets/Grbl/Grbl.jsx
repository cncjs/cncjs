import ensureArray from 'ensure-array';
import _get from 'lodash/get';
import _isEmpty from 'lodash/isEmpty';
import _mapValues from 'lodash/mapValues';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import { ProgressBar } from 'react-bootstrap';
import mapGCodeToText from 'app/lib/gcode-text';
import i18n from 'app/lib/i18n';
import Card from 'app/components/Card';
import Clickable from 'app/components/Clickable';
import FontAwesomeIcon from 'app/components/FontAwesomeIcon';
import FormGroup from 'app/components/FormGroup';
import { Container, Row, Col } from 'app/components/GridSystem';
import FeedOverride from './FeedOverride';
import SpindleOverride from './SpindleOverride';
import RapidOverride from './RapidOverride';
import Readout from './Readout';
import styles from './index.styl';

class Grbl extends PureComponent {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    // https://github.com/grbl/grbl/wiki/Interfacing-with-Grbl
    // Grbl v0.9: BLOCK_BUFFER_SIZE (18), RX_BUFFER_SIZE (128)
    // Grbl v1.1: BLOCK_BUFFER_SIZE (16), RX_BUFFER_SIZE (128)
    plannerBufferMax = 0;

    plannerBufferMin = 0;

    receiveBufferMax = 128;

    receiveBufferMin = 0;

    render() {
        const { state, actions } = this.props;
        const none = '–';
        const panel = state.panel;
        const controllerState = state.controller.state || {};
        const parserState = _get(controllerState, 'parserstate', {});
        const activeState = _get(controllerState, 'status.activeState') || none;
        const feedrate = _get(controllerState, 'status.feedrate', _get(parserState, 'feedrate', none));
        const spindle = _get(controllerState, 'status.spindle', _get(parserState, 'spindle', none));
        const tool = _get(parserState, 'tool', none);
        const ov = _get(controllerState, 'status.ov', []);
        const [ovF = 0, ovR = 0, ovS = 0] = ov;
        const buf = _get(controllerState, 'status.buf', {});
        const modal = _mapValues(parserState.modal || {}, mapGCodeToText);
        const receiveBufferStyle = ((rx) => {
            // danger: 0-7
            // warning: 8-15
            // info: >=16
            rx = Number(rx) || 0;
            if (rx >= 16) {
                return 'info';
            }
            if (rx >= 8) {
                return 'warning';
            }
            return 'danger';
        })(buf.rx);

        this.plannerBufferMax = Math.max(this.plannerBufferMax, buf.planner) || this.plannerBufferMax;
        this.receiveBufferMax = Math.max(this.receiveBufferMax, buf.rx) || this.receiveBufferMax;

        return (
            <Container fluid>
                <FormGroup>
                    {(ovF > 0) && (
                        <FeedOverride value={ovF} />
                    )}
                    {(ovS > 0) && (
                        <SpindleOverride value={ovS} />
                    )}
                    {(ovR > 0) && (
                        <RapidOverride value={ovR} />
                    )}
                </FormGroup>
                <Card>
                    {!_isEmpty(buf) && (
                        <>
                            <Clickable
                                onClick={actions.toggleQueueReports}
                                style={{ width: '100%' }}
                            >
                                {({ hovered }) => (
                                    <Card.Header
                                        style={{
                                            backgroundColor: hovered ? 'rgba(0, 0, 0, 0.075)' : 'rgba(0, 0, 0, 0.05)',
                                            borderBottomWidth: panel.queueReports.expanded ? 1 : 0,
                                        }}
                                    >
                                        <Row>
                                            <Col>{i18n._('Queue Reports')}</Col>
                                            <Col width="auto">
                                                <FontAwesomeIcon
                                                    icon={panel.queueReports.expanded ? 'chevron-up' : 'chevron-down' }
                                                    fixedWidth
                                                    style={{
                                                        color: '#222',
                                                        opacity: hovered ? 1 : 0.5,
                                                    }}
                                                />
                                            </Col>
                                        </Row>
                                    </Card.Header>
                                )}
                            </Clickable>
                            {panel.queueReports.expanded && (
                                <Card.Body>
                                    <Row>
                                        <Col width={4}>
                                            <div className={styles.textEllipsis} title={i18n._('Planner Buffer')}>
                                                {i18n._('Planner Buffer')}
                                            </div>
                                        </Col>
                                        <Col width={8}>
                                            <ProgressBar
                                                style={{ marginBottom: 0 }}
                                                bsStyle="info"
                                                min={this.plannerBufferMin}
                                                max={this.plannerBufferMax}
                                                now={buf.planner}
                                                label={(
                                                    <span className={styles.progressbarLabel}>
                                                        {buf.planner}
                                                    </span>
                                                )}
                                            />
                                        </Col>
                                    </Row>
                                    <Row>
                                        <Col width={4}>
                                            <div className={styles.textEllipsis} title={i18n._('Receive Buffer')}>
                                                {i18n._('Receive Buffer')}
                                            </div>
                                        </Col>
                                        <Col width={4}>
                                            <ProgressBar
                                                style={{ marginBottom: 0 }}
                                                bsStyle={receiveBufferStyle}
                                                min={this.receiveBufferMin}
                                                max={this.receiveBufferMax}
                                                now={buf.rx}
                                                label={(
                                                    <span className={styles.progressbarLabel}>
                                                        {buf.rx}
                                                    </span>
                                                )}
                                            />
                                        </Col>
                                    </Row>
                                </Card.Body>
                            )}
                        </>
                    )}
                </Card>
                <Card style={{ borderTop: 0 }}>
                    <Clickable
                        onClick={actions.toggleStatusReports}
                        style={{ width: '100%' }}
                    >
                        {({ hovered }) => (
                            <Card.Header
                                style={{
                                    backgroundColor: hovered ? 'rgba(0, 0, 0, 0.075)' : 'rgba(0, 0, 0, 0.05)',
                                    borderBottomWidth: panel.statusReports.expanded ? 1 : 0,
                                }}
                            >
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
                            </Card.Header>
                        )}
                    </Clickable>
                    {panel.statusReports.expanded && (
                        <Card.Body>
                            <Row>
                                <Col width={4}>
                                    <div className={styles.textEllipsis} title={i18n._('State')}>
                                        {i18n._('State')}
                                    </div>
                                </Col>
                                <Col width={8}>
                                    <Readout>
                                        {activeState}
                                    </Readout>
                                </Col>
                            </Row>
                            <Row>
                                <Col width={4}>
                                    <div className={styles.textEllipsis} title={i18n._('Feed Rate')}>
                                        {i18n._('Feed Rate')}
                                    </div>
                                </Col>
                                <Col width={8}>
                                    <div className={styles.well}>
                                        {feedrate}
                                    </div>
                                </Col>
                            </Row>
                            <Row>
                                <Col width={4}>
                                    <div className={styles.textEllipsis} title={i18n._('Spindle')}>
                                        {i18n._('Spindle')}
                                    </div>
                                </Col>
                                <Col width={8}>
                                    <div className={styles.well}>
                                        {spindle}
                                    </div>
                                </Col>
                            </Row>
                            <Row>
                                <Col width={4}>
                                    <div className={styles.textEllipsis} title={i18n._('Tool Number')}>
                                        {i18n._('Tool Number')}
                                    </div>
                                </Col>
                                <Col width={8}>
                                    <div className={styles.well}>
                                        {tool}
                                    </div>
                                </Col>
                            </Row>
                        </Card.Body>
                    )}
                </Card>
                <Card style={{ borderTop: 0 }}>
                    <Clickable
                        onClick={actions.toggleModalGroups}
                        style={{ width: '100%' }}
                    >
                        {({ hovered }) => (
                            <Card.Header
                                style={{
                                    backgroundColor: hovered ? 'rgba(0, 0, 0, 0.075)' : 'rgba(0, 0, 0, 0.05)',
                                    borderBottomWidth: panel.modalGroups.expanded ? 1 : 0,
                                }}
                            >
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
                            </Card.Header>
                        )}
                    </Clickable>
                    {panel.modalGroups.expanded && (
                        <Card.Body>
                            <Row>
                                <Col width={4}>
                                    <div className={styles.textEllipsis} title={i18n._('Motion')}>
                                        {i18n._('Motion')}
                                    </div>
                                </Col>
                                <Col width={8}>
                                    <div className={styles.well} title={modal.motion}>
                                        {modal.motion || none}
                                    </div>
                                </Col>
                            </Row>
                            <Row>
                                <Col width={4}>
                                    <div className={styles.textEllipsis} title={i18n._('Coordinate')}>
                                        {i18n._('Coordinate')}
                                    </div>
                                </Col>
                                <Col width={8}>
                                    <div className={styles.well} title={modal.wcs}>
                                        {modal.wcs || none}
                                    </div>
                                </Col>
                            </Row>
                            <Row>
                                <Col width={4}>
                                    <div className={styles.textEllipsis} title={i18n._('Plane')}>
                                        {i18n._('Plane')}
                                    </div>
                                </Col>
                                <Col width={8}>
                                    <div className={styles.well} title={modal.plane}>
                                        {modal.plane || none}
                                    </div>
                                </Col>
                            </Row>
                            <Row>
                                <Col width={4}>
                                    <div className={styles.textEllipsis} title={i18n._('Distance')}>
                                        {i18n._('Distance')}
                                    </div>
                                </Col>
                                <Col width={8}>
                                    <div className={styles.well} title={modal.distance}>
                                        {modal.distance || none}
                                    </div>
                                </Col>
                            </Row>
                            <Row>
                                <Col width={4}>
                                    <div className={styles.textEllipsis} title={i18n._('Feed Rate')}>
                                        {i18n._('Feed Rate')}
                                    </div>
                                </Col>
                                <Col width={8}>
                                    <div className={styles.well} title={modal.feedrate}>
                                        {modal.feedrate || none}
                                    </div>
                                </Col>
                            </Row>
                            <Row>
                                <Col width={4}>
                                    <div className={styles.textEllipsis} title={i18n._('Units')}>
                                        {i18n._('Units')}
                                    </div>
                                </Col>
                                <Col width={8}>
                                    <div className={styles.well} title={modal.units}>
                                        {modal.units || none}
                                    </div>
                                </Col>
                            </Row>
                            <Row>
                                <Col width={4}>
                                    <div className={styles.textEllipsis} title={i18n._('Program')}>
                                        {i18n._('Program')}
                                    </div>
                                </Col>
                                <Col width={8}>
                                    <div className={styles.well} title={modal.program}>
                                        {modal.program || none}
                                    </div>
                                </Col>
                            </Row>
                            <Row>
                                <Col width={4}>
                                    <div className={styles.textEllipsis} title={i18n._('Spindle')}>
                                        {i18n._('Spindle')}
                                    </div>
                                </Col>
                                <Col width={8}>
                                    <div className={styles.well} title={modal.spindle}>
                                        {modal.spindle || none}
                                    </div>
                                </Col>
                            </Row>
                            <Row>
                                <Col width={4}>
                                    <div className={styles.textEllipsis} title={i18n._('Coolant')}>
                                        {i18n._('Coolant')}
                                    </div>
                                </Col>
                                <Col width={8}>
                                    <div className={styles.well}>
                                        {ensureArray(modal.coolant).map(coolant => (
                                            <div title={coolant} key={coolant}>{coolant || none}</div>
                                        ))}
                                    </div>
                                </Col>
                            </Row>
                        </Card.Body>
                    )}
                </Card>
            </Container>
        );
    }
}

export default Grbl;
