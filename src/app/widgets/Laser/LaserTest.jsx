import {
  Accordion,
  AccordionBody,
  AccordionHeader,
  AccordionItem,
  Box,
  Button,
  Flex,
  InputControl,
  InputGroup,
  InputGroupAddon,
  InputGroupAppend,
  InputGroupPrepend,
  TextLabel,
} from '@tonic-ui/react';
import { ensurePositiveNumber } from 'ensure-type';
import _get from 'lodash/get';
import React, { useState } from 'react';
import { connect } from 'react-redux';
import {
  CONNECTION_STATE_CONNECTED,
} from '@app/constants/connection';
import controller from '@app/lib/controller';
import i18n from '@app/lib/i18n';
import useWidgetConfig from '@app/widgets/shared/useWidgetConfig';

const powerTrackSx = {
  height: '8px',
  border: 1,
  borderColor: 'border.primary',
  borderRadius: 'full',
  background: 'linear-gradient(to right, var(--tonic-colors-info-icon) var(--laser-power), var(--tonic-colors-border-secondary) var(--laser-power))',
};

const powerThumbSx = {
  appearance: 'none',
  width: '16px',
  height: '16px',
  borderRadius: '50%',
  border: '2px solid',
  borderColor: 'background.highest',
  backgroundColor: 'info.icon',
  boxShadow: '0 0 0 1px var(--tonic-colors-border-primary)',
};

/**
 * @param {{ isConnected: boolean }} props
 */
function LaserTest({
  isConnected,
}) {
  const config = useWidgetConfig();
  const [powerDraft, setPowerDraft] = useState(() => (
    String(ensurePositiveNumber(config.get('test.power', 0)))
  ));
  const [durationDraft, setDurationDraft] = useState(() => (
    String(ensurePositiveNumber(config.get('test.duration', 0)))
  ));
  const [maxSDraft, setMaxSDraft] = useState(() => (
    String(ensurePositiveNumber(config.get('test.maxS', 1000)))
  ));
  const expanded = config.get('panel.laserTest.expanded');

  const numericPower = powerDraft === '' ? null : Number(powerDraft);
  const numericDuration = durationDraft === '' ? null : Number(durationDraft);
  const numericMaxS = maxSDraft === '' ? null : Number(maxSDraft);
  const isLaserTestReady = (
    isConnected &&
    [numericPower, numericDuration, numericMaxS].every(value => (
      value !== null && Number.isFinite(value) && value >= 0
    ))
  );

  const updateDraft = (path, setDraft, value) => {
    const draft = String(value);
    setDraft(draft);
    config.set(path, ensurePositiveNumber(value));
  };

  return (
    <Accordion border={1} borderColor="border.secondary">
      <AccordionItem
        isExpanded={Boolean(expanded)}
        onToggle={({ isExpanded }) => config.set('panel.laserTest.expanded', isExpanded)}
      >
        <AccordionHeader aria-label={i18n._(expanded ? 'Collapse' : 'Expand')}>
          {i18n._('Laser Test')}
        </AccordionHeader>
        <AccordionBody>
          <Box p="3x">
            <Flex alignItems="center" mb="2x">
              <Box width="35%">
                <TextLabel>{i18n._('Power (%)')}</TextLabel>
              </Box>
              <Box width="65%" textAlign="center">
                <Box
                  as="output"
                  display="inline-block"
                  mb="2x"
                >
                  {powerDraft}%
                </Box>
                <Box
                  as="input"
                  type="range"
                  aria-label="Laser power"
                  aria-valuetext={`${powerDraft}%`}
                  value={numericPower === null ? 0 : numericPower}
                  min={0}
                  max={100}
                  step={1}
                  onChange={event => updateDraft('test.power', setPowerDraft, event.target.value)}
                  style={{ '--laser-power': `${numericPower === null ? 0 : numericPower}%` }}
                  sx={{
                    appearance: 'none',
                    display: 'block',
                    width: '100%',
                    height: '24px',
                    margin: 0,
                    padding: 0,
                    background: 'transparent',
                    cursor: 'pointer',
                    borderRadius: 'sm',
                    '&::-webkit-slider-runnable-track': powerTrackSx,
                    '&::-moz-range-track': powerTrackSx,
                    '&::-webkit-slider-thumb': { ...powerThumbSx, marginTop: '-5px' },
                    '&::-moz-range-thumb': powerThumbSx,
                    _focusVisible: { outline: '2px solid', outlineColor: 'info.border', outlineOffset: '2px' },
                  }}
                />
              </Box>
            </Flex>
            <Flex alignItems="center" mb="2x">
              <Box width="35%">
                <TextLabel>{i18n._('Test duration')}</TextLabel>
              </Box>
              <Box width="65%">
                <InputGroup>
                  <InputControl
                    flex="1"
                    minWidth="0"
                    type="number"
                    value={durationDraft}
                    min={0}
                    step={1}
                    slotProps={{ input: { 'aria-label': 'Test duration in milliseconds' } }}
                    onChange={event => updateDraft(
                      'test.duration',
                      setDurationDraft,
                      event.target.value
                    )}
                  />
                  <InputGroupAppend>
                    <InputGroupAddon>{i18n._('ms')}</InputGroupAddon>
                  </InputGroupAppend>
                </InputGroup>
              </Box>
            </Flex>
            <Flex alignItems="center" mb="2x">
              <Box width="35%">
                <TextLabel>{i18n._('Maximum value')}</TextLabel>
              </Box>
              <Box width="65%">
                <InputGroup>
                  <InputGroupPrepend>
                    <InputGroupAddon>S</InputGroupAddon>
                  </InputGroupPrepend>
                  <InputControl
                    flex="1"
                    minWidth="0"
                    type="number"
                    value={maxSDraft}
                    min={0}
                    step={1}
                    slotProps={{ input: { 'aria-label': 'Maximum S value' } }}
                    onChange={event => updateDraft(
                      'test.maxS',
                      setMaxSDraft,
                      event.target.value
                    )}
                  />
                </InputGroup>
              </Box>
            </Flex>
            <Flex>
              <Button
                type="button"
                disabled={!isLaserTestReady}
                onClick={() => controller.command(
                  'laser_test',
                  numericPower,
                  numericDuration,
                  numericMaxS
                )}
              >
                {i18n._('Laser Test')}
              </Button>
              <Button
                type="button"
                ml="2x"
                disabled={!isConnected}
                onClick={() => controller.command('laser_test', 0)}
              >
                {i18n._('Laser Off')}
              </Button>
            </Flex>
          </Box>
        </AccordionBody>
      </AccordionItem>
    </Accordion>
  );
}

export default connect(store => {
  const connectionState = _get(store, 'connection.state');
  const isConnected = (connectionState === CONNECTION_STATE_CONNECTED);

  return {
    isConnected,
  };
})(LaserTest);
