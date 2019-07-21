import _ from 'lodash';
import Slider from 'rc-slider';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import styled from 'styled-components';
import { Button, ButtonGroup } from 'app/components/Buttons';
import Clickable from 'app/components/Clickable';
import FontAwesomeIcon from 'app/components/FontAwesomeIcon';
import FormGroup from 'app/components/FormGroup';
import { Container, Row, Col } from 'app/components/GridSystem';
import Label from 'app/components/Label';
import Panel from 'app/components/Panel';
import RepeatableButton from 'app/components/RepeatableButton';
import Space from 'app/components/Space';
import Text from 'app/components/Text';
import Toggler from 'app/components/Toggler';
import controller from 'app/lib/controller';
import i18n from 'app/lib/i18n';
import {
    // Grbl
    GRBL,
    // Marlin
    MARLIN,
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
            const ovS = _.get(controllerState, 'status.ov[2]', []);
            scale = Number(ovS) || 0;
        }
        if (controllerType === MARLIN) {
            const ovS = _.get(controllerState, 'ovS');
            scale = Number(ovS) || 0;
        }
        if (controllerType === SMOOTHIE) {
            const ovS = _.get(controllerState, 'status.ovS');
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
            <Container fluid>
                <FormGroup>
                    <Label>
                        {i18n._('Laser Intensity Control')}
                    </Label>
                    <Row style={{ alignItems: 'center' }}>
                        <Col width="auto">
                            <DRO>
                                {laserIntensityScale ? laserIntensityScale + '%' : none}
                            </DRO>
                        </Col>
                        <Col width="auto">
                            <Space width={8} />
                        </Col>
                        <Col>
                            <ButtonGroup btnSize="sm" style={{ width: '100%' }}>
                                <RepeatableButton
                                    disabled={!canClick}
                                    onClick={() => {
                                        controller.command('spindleOverride', -10);
                                    }}
                                    style={{ fontSize: '.75rem', padding: '.25rem' }}
                                >
                                    <FontAwesomeIcon icon="arrow-down" fixedWidth />
                                    <Text>{i18n._('-10%')}</Text>
                                </RepeatableButton>
                                <RepeatableButton
                                    disabled={!canClick}
                                    onClick={() => {
                                        controller.command('spindleOverride', -1);
                                    }}
                                    style={{ fontSize: '.66rem', padding: '.25rem' }}
                                >
                                    <FontAwesomeIcon icon="arrow-down" fixedWidth />
                                    <Text>{i18n._('-1%')}</Text>
                                </RepeatableButton>
                                <RepeatableButton
                                    disabled={!canClick}
                                    onClick={() => {
                                        controller.command('spindleOverride', 1);
                                    }}
                                    style={{ fontSize: '.66rem', padding: '.25rem' }}
                                >
                                    <FontAwesomeIcon icon="arrow-up" fixedWidth />
                                    <Text>{i18n._('1%')}</Text>
                                </RepeatableButton>
                                <RepeatableButton
                                    disabled={!canClick}
                                    onClick={() => {
                                        controller.command('spindleOverride', 10);
                                    }}
                                    style={{ fontSize: '.75rem', padding: '.25rem' }}
                                >
                                    <FontAwesomeIcon icon="arrow-up" fixedWidth />
                                    <Text>{i18n._('10%')}</Text>
                                </RepeatableButton>
                            </ButtonGroup>
                        </Col>
                        <Col width="auto">
                            <Space width={8} />
                        </Col>
                        <Col width="auto">
                            <Clickable
                                onClick={() => {
                                    if (!canClick) {
                                        return;
                                    }
                                    controller.command('spindleOverride', 0);
                                }}
                            >
                                {({ hovered }) => (
                                    <FontAwesomeIcon
                                        icon="undo"
                                        fixedWidth
                                        style={{
                                            color: hovered ? '#222' : '#666',
                                        }}
                                    />
                                )}
                            </Clickable>
                        </Col>
                    </Row>
                </FormGroup>
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
                    {panel.laserTest.expanded && (
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
                            <div>
                                <Button
                                    btnSize="sm"
                                    btnStyle="default"
                                    disabled={!canClick}
                                    onClick={actions.laserTestOn}
                                    style={{ minWidth: 80 }}
                                >
                                    {i18n._('Laser Test')}
                                </Button>
                                <Button
                                    btnSize="sm"
                                    btnStyle="default"
                                    disabled={!canClick}
                                    onClick={actions.laserTestOff}
                                    style={{ minWidth: 80 }}
                                >
                                    {i18n._('Laser Off')}
                                </Button>
                            </div>
                        </Panel.Body>
                    )}
                </Panel>
            </Container>
        );
    }
}

export default Laser;

const DRO = styled.div`
    border: 1px solid #ccc;
    text-align: right;
    padding: 4px 8px;
    font-size: 1rem;
    font-weight: bold;
    min-width: 60px;
`;
