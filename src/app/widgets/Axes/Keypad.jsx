import { faCircleArrowDown, faCircleArrowUp } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { AddIcon, MinusIcon } from '@tonic-ui/react-icons';
import {
  Box,
  Button,
  Dropdown,
  DropdownButton,
  Flex,
  Space,
} from '@tonic-ui/react';
import cx from 'classnames';
import { ensureArray } from 'ensure-type';
import _includes from 'lodash/includes';
import React from 'react';
import RepeatableButton from '@app/components/RepeatableButton';
import {
  IMPERIAL_UNITS,
  IMPERIAL_STEPS,
  METRIC_UNITS,
  METRIC_STEPS
} from '@app/constants';
import controller from '@app/lib/controller';
import i18n from '@app/lib/i18n';
import { useAxes } from './context';
import styles from './index.styl';

const keypadTextSx = { position: 'relative', display: 'inline-block', verticalAlign: 'baseline' };
const keypadDirectionSx = { ...keypadTextSx, minWidth: '10px' };
const keypadSubscriptSx = { ...keypadDirectionSx, fontSize: '80%', lineHeight: 0 };

/**
 * @returns {JSX.Element}
 */
function Keypad() {
  const {
    state: { canClick = false, units, axes = [], jog },
    onGetJogDistance,
    onJog,
    onMove,
    onSelectStep,
    onStepBackward,
    onStepForward,
  } = useAxes();
  const renderImperialMenuItems = () => {
    const imperialJogDistances = ensureArray(jog.imperial.distances);
    const imperialJogSteps = [
      ...imperialJogDistances,
      ...IMPERIAL_STEPS
    ];
    const step = jog.imperial.step;

    return imperialJogSteps.map((stepValue, index) => ({
      value: index,
      step: stepValue,
      props: { selected: index === step },
    }));
  };

  const renderMetricMenuItems = () => {
    const metricJogDistances = ensureArray(jog.metric.distances);
    const metricJogSteps = [
      ...metricJogDistances,
      ...METRIC_STEPS
    ];
    const step = jog.metric.step;

    return metricJogSteps.map((stepValue, index) => ({
      value: index,
      step: stepValue,
      props: { selected: index === step },
    }));
  };

  const canChangeUnits = canClick;
  const canChangeStep = canClick;
  const imperialJogDistances = ensureArray(jog.imperial.distances);
  const metricJogDistances = ensureArray(jog.metric.distances);
  const imperialJogSteps = [
    ...imperialJogDistances,
    ...IMPERIAL_STEPS
  ];
  const metricJogSteps = [
    ...metricJogDistances,
    ...METRIC_STEPS
  ];
  const canStepForward = canChangeStep && (
    (units === IMPERIAL_UNITS && (jog.imperial.step < imperialJogSteps.length - 1)) ||
            (units === METRIC_UNITS && (jog.metric.step < metricJogSteps.length - 1))
  );
  const canStepBackward = canChangeStep && (
    (units === IMPERIAL_UNITS && (jog.imperial.step > 0)) ||
            (units === METRIC_UNITS && (jog.metric.step > 0))
  );
  const canClickX = canClick && _includes(axes, 'x');
  const canClickY = canClick && _includes(axes, 'y');
  const canClickXY = canClickX && canClickY;
  const canClickZ = canClick && _includes(axes, 'z');
  const highlightX = canClickX && (jog.keypad || jog.axis === 'x');
  const highlightY = canClickY && (jog.keypad || jog.axis === 'y');
  const highlightZ = canClickZ && (jog.keypad || jog.axis === 'z');
  const unitItems = [
    { value: IMPERIAL_UNITS, label: i18n._('G20 (inch)'), props: { selected: units === IMPERIAL_UNITS } },
    { value: METRIC_UNITS, label: i18n._('G21 (mm)'), props: { selected: units === METRIC_UNITS } },
  ];
  const imperialStepItems = renderImperialMenuItems();
  const metricStepItems = renderMetricMenuItems();

  return (
    <Box className={styles.keypad}>
      <Flex className={styles.keypadControls} gap="1x" alignItems="stretch">
        <Box flex="8 1 0%" minWidth={0}>
          <Box className={styles.rowSpace}>
            <Flex gap="1x">
              <Box flex="1 1 0%">
                <Box className={styles.colSpace}>
                  <Button
                    aria-label="Move X negative Y positive"
                    size="sm"
                    className={styles.btnKeypad}
                    onClick={() => {
                      const distance = onGetJogDistance();
                      onJog({ X: -distance, Y: distance });
                    }}
                    disabled={!canClickXY}
                    title={i18n._('Move X- Y+')}
                  >
                    <FontAwesomeIcon
                      aria-hidden="true"
                      icon={faCircleArrowUp}
                      className={styles['rotate--45deg']}
                      style={{ fontSize: 16 }}
                    />
                  </Button>
                </Box>
              </Box>
              <Box flex="1 1 0%">
                <Box className={styles.colSpace}>
                  <Button
                    aria-label="Move Y positive"
                    size="sm"
                    className={cx(
                      styles.btnKeypad,
                      { [styles.highlight]: highlightY }
                    )}
                    onClick={() => {
                      const distance = onGetJogDistance();
                      onJog({ Y: distance });
                    }}
                    disabled={!canClickY}
                    title={i18n._('Move Y+')}
                  >
                    <Box sx={keypadTextSx}>Y</Box>
                    <Box sx={keypadDirectionSx}>+</Box>
                  </Button>
                </Box>
              </Box>
              <Box flex="1 1 0%">
                <Box className={styles.colSpace}>
                  <Button
                    aria-label="Move X positive Y positive"
                    size="sm"
                    className={styles.btnKeypad}
                    onClick={() => {
                      const distance = onGetJogDistance();
                      onJog({ X: distance, Y: distance });
                    }}
                    disabled={!canClickXY}
                    title={i18n._('Move X+ Y+')}
                  >
                    <FontAwesomeIcon
                      aria-hidden="true"
                      icon={faCircleArrowUp}
                      className={styles['rotate-45deg']}
                      style={{ fontSize: 16 }}
                    />
                  </Button>
                </Box>
              </Box>
              <Box flex="1 1 0%">
                <Box className={styles.colSpace}>
                  <Button
                    aria-label="Move Z positive"
                    size="sm"
                    className={cx(
                      styles.btnKeypad,
                      { [styles.highlight]: highlightZ }
                    )}
                    onClick={() => {
                      const distance = onGetJogDistance();
                      onJog({ Z: distance });
                    }}
                    disabled={!canClickZ}
                    title={i18n._('Move Z+')}
                  >
                    <Box sx={keypadTextSx}>Z</Box>
                    <Box sx={keypadDirectionSx}>+</Box>
                  </Button>
                </Box>
              </Box>
            </Flex>
          </Box>
          <Box className={styles.rowSpace}>
            <Flex gap="1x">
              <Box flex="1 1 0%">
                <Box className={styles.colSpace}>
                  <Button
                    aria-label="Move X negative"
                    size="sm"
                    className={cx(
                      styles.btnKeypad,
                      { [styles.highlight]: highlightX }
                    )}
                    onClick={() => {
                      const distance = onGetJogDistance();
                      onJog({ X: -distance });
                    }}
                    disabled={!canClickX}
                    title={i18n._('Move X-')}
                  >
                    <Box sx={keypadTextSx}>X</Box>
                    <Box sx={keypadDirectionSx}>-</Box>
                  </Button>
                </Box>
              </Box>
              <Box flex="1 1 0%">
                <Box className={styles.colSpace}>
                  <Button
                    size="sm"
                    className={styles.btnKeypad}
                    onClick={() => onMove({ X: 0, Y: 0 })}
                    disabled={!canClickXY}
                    title={i18n._('Move To XY Zero (G0 X0 Y0)')}
                  >
                    <Box sx={keypadTextSx}>X</Box>
                    <Box sx={keypadSubscriptSx}>0</Box>
                    <Box sx={keypadTextSx}>Y</Box>
                    <Box sx={keypadSubscriptSx}>0</Box>
                  </Button>
                </Box>
              </Box>
              <Box flex="1 1 0%">
                <Box className={styles.colSpace}>
                  <Button
                    aria-label="Move X positive"
                    size="sm"
                    className={cx(
                      styles.btnKeypad,
                      { [styles.highlight]: highlightX }
                    )}
                    onClick={() => {
                      const distance = onGetJogDistance();
                      onJog({ X: distance });
                    }}
                    disabled={!canClickX}
                    title={i18n._('Move X+')}
                  >
                    <Box sx={keypadTextSx}>X</Box>
                    <Box sx={keypadDirectionSx}>+</Box>
                  </Button>
                </Box>
              </Box>
              <Box flex="1 1 0%">
                <Box className={styles.colSpace}>
                  <Button
                    size="sm"
                    className={styles.btnKeypad}
                    onClick={() => onMove({ Z: 0 })}
                    disabled={!canClickZ}
                    title={i18n._('Move To Z Zero (G0 Z0)')}
                  >
                    <Box sx={keypadTextSx}>Z</Box>
                    <Box sx={keypadSubscriptSx}>0</Box>
                  </Button>
                </Box>
              </Box>
            </Flex>
          </Box>
          <Box className={styles.rowSpace}>
            <Flex gap="1x">
              <Box flex="1 1 0%">
                <Box className={styles.colSpace}>
                  <Button
                    aria-label="Move X negative Y negative"
                    size="sm"
                    className={styles.btnKeypad}
                    onClick={() => {
                      const distance = onGetJogDistance();
                      onJog({ X: -distance, Y: -distance });
                    }}
                    disabled={!canClickXY}
                    title={i18n._('Move X- Y-')}
                  >
                    <FontAwesomeIcon
                      aria-hidden="true"
                      icon={faCircleArrowDown}
                      className={styles['rotate-45deg']}
                      style={{ fontSize: 16 }}
                    />
                  </Button>
                </Box>
              </Box>
              <Box flex="1 1 0%">
                <Box className={styles.colSpace}>
                  <Button
                    aria-label="Move Y negative"
                    size="sm"
                    className={cx(
                      styles.btnKeypad,
                      { [styles.highlight]: highlightY }
                    )}
                    onClick={() => {
                      const distance = onGetJogDistance();
                      onJog({ Y: -distance });
                    }}
                    disabled={!canClickY}
                    title={i18n._('Move Y-')}
                  >
                    <Box sx={keypadTextSx}>Y</Box>
                    <Box sx={keypadDirectionSx}>-</Box>
                  </Button>
                </Box>
              </Box>
              <Box flex="1 1 0%">
                <Box className={styles.colSpace}>
                  <Button
                    aria-label="Move X positive Y negative"
                    size="sm"
                    className={styles.btnKeypad}
                    onClick={() => {
                      const distance = onGetJogDistance();
                      onJog({ X: distance, Y: -distance });
                    }}
                    disabled={!canClickXY}
                    title={i18n._('Move X+ Y-')}
                  >
                    <FontAwesomeIcon
                      aria-hidden="true"
                      icon={faCircleArrowDown}
                      className={styles['rotate--45deg']}
                      style={{ fontSize: 16 }}
                    />
                  </Button>
                </Box>
              </Box>
              <Box flex="1 1 0%">
                <Box className={styles.colSpace}>
                  <Button
                    aria-label="Move Z negative"
                    size="sm"
                    className={cx(
                      styles.btnKeypad,
                      { [styles.highlight]: highlightZ }
                    )}
                    onClick={() => {
                      const distance = onGetJogDistance();
                      onJog({ Z: -distance });
                    }}
                    disabled={!canClickZ}
                    title={i18n._('Move Z-')}
                  >
                    <Box sx={keypadTextSx}>Z</Box>
                    <Box sx={keypadDirectionSx}>-</Box>
                  </Button>
                </Box>
              </Box>
            </Flex>
          </Box>
        </Box>
        <Box flex="4 1 0%" minWidth={0}>
          <Box className={styles.rowSpace}>
            <Dropdown
              portalled
              items={unitItems}
              value={unitItems.find(item => item.value === units) || null}
              slotProps={{ root: { style: { width: '100%' } } }}
              renderItem={item => item?.label ?? ''}
              renderToggle={({ renderItem, value: selected }) => (
                <DropdownButton
                  disabled={!canChangeUnits}
                  style={{
                    textAlign: 'right',
                    width: '100%'
                  }}
                >
                  {renderItem(selected)}
                </DropdownButton>
              )}
              renderContent={({ items, renderItems }) => (
                <>
                  <Box
                    px="3x"
                    py="2x"
                    role="heading"
                    fontSize="sm"
                    color="text.secondary"
                  >
                    {i18n._('Units')}
                  </Box>
                  {renderItems(items)}
                </>
              )}
              onChange={item => controller.command('gcode', item.value === IMPERIAL_UNITS ? 'G20' : 'G21')}
            />
          </Box>
          <Box className={styles.rowSpace}>
            {units === IMPERIAL_UNITS && (
              <Dropdown
                portalled
                items={imperialStepItems}
                value={imperialStepItems[jog.imperial.step] || null}
                slotProps={{
                  root: { style: { width: '100%' } },
                  content: { style: { maxHeight: 150, overflowY: 'auto' } },
                }}
                renderItem={(item) => (
                  <>
                    {item?.step}
                    <Space width="1x" />
                    <Box as="sub" sx={{ display: 'inline', fontSize: '80%', lineHeight: 0 }}>{i18n._('in')}</Box>
                  </>
                )}
                renderToggle={({ renderItem, value: selected }) => (
                  <DropdownButton
                    disabled={!canChangeStep}
                    style={{
                      textAlign: 'right',
                      width: '100%'
                    }}
                  >
                    {renderItem(selected)}
                  </DropdownButton>
                )}
                renderContent={({ items, renderItems }) => (
                  <>
                    <Box
                      px="3x"
                      py="2x"
                      role="heading"
                      fontSize="sm"
                      color="text.secondary"
                    >
                      {i18n._('Imperial')}
                    </Box>
                    {renderItems(items)}
                  </>
                )}
                onChange={item => onSelectStep(item.value)}
              />
            )}
            {units === METRIC_UNITS && (
              <Dropdown
                portalled
                items={metricStepItems}
                value={metricStepItems[jog.metric.step] || null}
                slotProps={{
                  root: { style: { width: '100%' } },
                  content: { style: { maxHeight: 150, overflowY: 'auto' } },
                }}
                renderItem={(item) => (
                  <>
                    {item?.step}
                    <Space width="1x" />
                    <Box as="sub" sx={{ display: 'inline', fontSize: '80%', lineHeight: 0 }}>{i18n._('mm')}</Box>
                  </>
                )}
                renderToggle={({ renderItem, value: selected }) => (
                  <DropdownButton
                    disabled={!canChangeStep}
                    style={{
                      textAlign: 'right',
                      width: '100%'
                    }}
                  >
                    {renderItem(selected)}
                  </DropdownButton>
                )}
                renderContent={({ items, renderItems }) => (
                  <>
                    <Box
                      px="3x"
                      py="2x"
                      role="heading"
                      fontSize="sm"
                      color="text.secondary"
                    >
                      {i18n._('Metric')}
                    </Box>
                    {renderItems(items)}
                  </>
                )}
                onChange={item => onSelectStep(item.value)}
              />
            )}
          </Box>
          <Box className={styles.rowSpace}>
            <Flex gap="1x">
              <Box flex="1 1 0%">
                <RepeatableButton
                  aria-label="Decrease step size"
                  disabled={!canStepBackward}
                  width="100%"
                  onClick={onStepBackward}
                >
                  <MinusIcon aria-hidden="true" size="1em" />
                </RepeatableButton>
              </Box>
              <Box flex="1 1 0%">
                <RepeatableButton
                  aria-label="Increase step size"
                  disabled={!canStepForward}
                  width="100%"
                  onClick={onStepForward}
                >
                  <AddIcon aria-hidden="true" size="1em" />
                </RepeatableButton>
              </Box>
            </Flex>
          </Box>
        </Box>
      </Flex>
    </Box>
  );
}

export default Keypad;
