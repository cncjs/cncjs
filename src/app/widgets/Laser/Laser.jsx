import _ from 'lodash';
import Slider from 'rc-slider';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import { Button } from 'app/components/Buttons';
import Clickable from 'app/components/Clickable';
import FontAwesomeIcon from 'app/components/FontAwesomeIcon';
import Input from 'app/components/FormControl/Input';
import FormGroup from 'app/components/FormGroup';
import { Container, Row, Col } from 'app/components/GridSystem';
import HorizontalForm from 'app/components/HorizontalForm';
import InputGroup from 'app/components/InputGroup';
import Label from 'app/components/Label';
import Panel from 'app/components/Panel';
import Text from 'app/components/Text';
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
import LaserIntensityOverride from './LaserIntensityOverride';
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
        const { canClick, panel, test } = state;
        const laserIntensityScale = this.getLaserIntensityScale();

        return (
            <Container fluid>
                <FormGroup>
                    <Label>
                        {i18n._('Laser Intensity Control')}
                    </Label>
                    {(laserIntensityScale > 0) && (
                        <LaserIntensityOverride value={laserIntensityScale} />
                    )}
                </FormGroup>
                <Panel className={styles.panel}>
                    <Panel.Heading className={styles.panelHeading}>
                        <Clickable
                            onClick={actions.toggleLaserTest}
                            style={{ width: '100%' }}
                        >
                            {({ hovered }) => (
                                <Row>
                                    <Col>{i18n._('Laser Test')}</Col>
                                    <Col width="auto">
                                        <FontAwesomeIcon
                                            icon={panel.laserTest.expanded ? 'chevron-up' : 'chevron-down'}
                                            fixedWidth
                                            style={{
                                                color: hovered ? '#222' : '#666',
                                            }}
                                        />
                                    </Col>
                                </Row>
                            )}
                        </Clickable>
                    </Panel.Heading>
                    {panel.laserTest.expanded && (
                        <Panel.Body>
                            <FormGroup>
                                <HorizontalForm spacing={['.75rem', '.75rem']}>
                                    {({ FormContainer, FormRow, FormCol }) => (
                                        <FormContainer>
                                            <FormRow>
                                                <FormCol style={{ whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                                                    {i18n._('Power (%)')}
                                                </FormCol>
                                                <FormCol style={{ wordBreak: 'break-all', textAlign: 'center' }}>
                                                    <Text>{test.power}%</Text>
                                                    <Slider
                                                        style={{ padding: 0 }}
                                                        defaultValue={test.power}
                                                        min={0}
                                                        max={100}
                                                        step={1}
                                                        onChange={actions.changeLaserTestPower}
                                                    />
                                                </FormCol>
                                            </FormRow>
                                            <FormRow>
                                                <FormCol style={{ whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                                                    {i18n._('Test duration')}
                                                </FormCol>
                                                <FormCol style={{ wordBreak: 'break-all' }}>
                                                    <InputGroup sm>
                                                        <Input
                                                            type="number"
                                                            value={test.duration}
                                                            min={0}
                                                            step={1}
                                                            onChange={actions.changeLaserTestDuration}
                                                        />
                                                        <InputGroup.Append>
                                                            <InputGroup.Text>
                                                                {i18n._('ms')}
                                                            </InputGroup.Text>
                                                        </InputGroup.Append>
                                                    </InputGroup>
                                                </FormCol>
                                            </FormRow>
                                            <FormRow>
                                                <FormCol style={{ whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                                                    {i18n._('Maximum value')}
                                                </FormCol>
                                                <FormCol style={{ wordBreak: 'break-all' }}>
                                                    <InputGroup sm>
                                                        <InputGroup.Prepend>
                                                            <InputGroup.Text>
                                                                {i18n._('S')}
                                                            </InputGroup.Text>
                                                        </InputGroup.Prepend>
                                                        <Input
                                                            type="number"
                                                            value={test.maxS}
                                                            min={0}
                                                            step={1}
                                                            onChange={actions.changeLaserTestMaxS}
                                                        />
                                                    </InputGroup>
                                                </FormCol>
                                            </FormRow>
                                        </FormContainer>
                                    )}
                                </HorizontalForm>
                            </FormGroup>
                            <div>
                                <Button
                                    sm
                                    disabled={!canClick}
                                    onClick={actions.laserTestOn}
                                >
                                    {i18n._('Laser Test')}
                                </Button>
                                <Button
                                    sm
                                    disabled={!canClick}
                                    onClick={actions.laserTestOff}
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
