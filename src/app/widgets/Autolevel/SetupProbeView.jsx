import {
  Box,
  Button,
  Dropdown,
  DropdownButton,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupAppend,
  LinearProgress,
  Space,
  Text,
  Tooltip,
} from '@tonic-ui/react';
import { ChevronLeftIcon, InfoIcon, PlayIcon, StopIcon } from '@tonic-ui/react-icons';
import React from 'react';
import i18n from '@app/lib/i18n';
import { METRIC_UNITS } from '@app/constants';
import { toDisplayUnits } from '@app/lib/units';
import ProbeAreaDiagram from './ProbeAreaDiagram';
import ScanPatternPreview from './ScanPatternPreview';
import { getScanPointCount } from './scanPath';
import ZProbeDiagram from './ZProbeDiagram';
import { PROBE_STATE_RUNNING } from './constants';
import styles from './SetupProbeView.styl';

const noop = () => {};

/**
 * @param {{id: string, label: string, value: *, unit?: string, error?: string, disabled?: boolean, min?: number, step?: number, name?: string, onChange?: Function, onFocus?: Function, onBlur?: Function}} props
 */
function NumberField({
  id,
  label,
  value,
  unit,
  error,
  disabled = false,
  min,
  step = 1,
  name,
  onChange = noop,
  onFocus,
  onBlur,
}) {
  return (
    <FormControl minWidth="0">
      <FormLabel htmlFor={id}>{label}</FormLabel>
      <InputGroup>
        <Input
          aria-label={label}
          flex="1"
          minWidth="0"
          disabled={disabled}
          id={id}
          min={min}
          name={name}
          onBlur={onBlur}
          onChange={onChange}
          onFocus={onFocus}
          step={step}
          type="number"
          value={value}
        />
        {unit && (
          <InputGroupAppend>
            <InputGroupAddon>{unit}</InputGroupAddon>
          </InputGroupAppend>
        )}
      </InputGroup>
      {error && <Text color="error.text" fontSize="sm">{error}</Text>}
    </FormControl>
  );
}

/**
 * @param {{label: string, help: string, items: Array, value: string, disabled?: boolean, onChange?: Function}} props
 */
function ScanField({ label, help, items, value, disabled = false, onChange = noop }) {
  const options = items.map(item => ({
    ...item,
    props: {
      'data-selected': item.value === value ? '' : undefined,
      'aria-current': item.value === value ? 'true' : undefined,
    },
  }));
  return (
    <FormControl minWidth="0">
      <Box alignItems="center" display="flex" gap="1x">
        <FormLabel>{label}</FormLabel>
        <Tooltip label={help} placement="top">
          <Box
            as="span" aria-label={help} role="img"
            tabIndex={0} sx={{ color: 'text.secondary', cursor: 'help' }}
          >
            <InfoIcon aria-hidden="true" size="1em" />
          </Box>
        </Tooltip>
      </Box>
      <Dropdown
        autoSelect
        disabled={disabled}
        items={options}
        matchWidth
        value={options.find(item => item.value === value) || null}
        renderItem={item => item?.label ?? ''}
        renderToggle={({ renderItem, value: selected }) => (
          <DropdownButton
            aria-label={label} disabled={disabled} width="100%"
            variant="secondary"
          >
            {renderItem(selected)}
          </DropdownButton>
        )}
        onChange={item => onChange({ target: { value: item.value } })}
      />
    </FormControl>
  );
}

/**
 * @param {{value?: object, canClick?: boolean, validationErrors?: object, onBack?: Function, onClearanceZChange?: Function, onEndXChange?: Function, onEndYChange?: Function, onEndZChange?: Function, onInputFocus?: Function, onProbeAreaBlur?: Function, onProbeFeedrateChange?: Function, onScanDirectionChange?: Function, onScanPatternChange?: Function, onShowStartProbeConfirmation?: Function, onShowStopProbeConfirmation?: Function, onShowTestProbeConfirmation?: Function, onStartXChange?: Function, onStartYChange?: Function, onStartZChange?: Function, onStepXChange?: Function, onStepYChange?: Function}} props
 */
function SetupProbeView({
  value = {},
  canClick = false,
  validationErrors = {},
  onBack = noop,
  onClearanceZChange = noop,
  onEndXChange = noop,
  onEndYChange = noop,
  onEndZChange = noop,
  onInputFocus = noop,
  onProbeAreaBlur = noop,
  onProbeFeedrateChange = noop,
  onScanDirectionChange = noop,
  onScanPatternChange = noop,
  onShowStartProbeConfirmation = noop,
  onShowStopProbeConfirmation = noop,
  onShowTestProbeConfirmation = noop,
  onStartXChange = noop,
  onStartYChange = noop,
  onStartZChange = noop,
  onStepXChange = noop,
  onStepYChange = noop,
}) {
  const {
    stepX,
    stepY,
    startX,
    startY,
    endX,
    endY,
    clearanceZ,
    startZ,
    endZ,
    feedrate,
    scanPattern = 'raster',
    scanDirection = 'x',
    probeState,
    probeProgress,
    units,
  } = value;
  const displayUnits = toDisplayUnits(units);
  const feedrateUnits = units === METRIC_UNITS ? i18n._('mm/min') : i18n._('in/min');
  const totalPoints = getScanPointCount({ startX, endX, stepX, startY, endY, stepY });
  const isProbing = probeState === PROBE_STATE_RUNNING;
  const canGoBack = !isProbing;
  const step = 1;

  return (
    <Box className={styles.setupProbeView}>
      <Box
        alignItems="center" className={styles.sectionHeader} display="flex"
        gap="2x"
      >
        <Button
          aria-label={i18n._('Back')} disabled={!canGoBack} onClick={onBack}
          size="sm" variant="ghost"
        >
          <ChevronLeftIcon aria-hidden="true" size="1em" />
        </Button>
        {i18n._('PROBE NEW SURFACE')}
      </Box>
      <Box className={styles.section}>
        <Text className={styles.sectionTitle}>{i18n._('Z-Axis Settings')}</Text>
        <Box mb="3x">
          <Button disabled={!canClick || isProbing} onClick={onShowTestProbeConfirmation} variant="ghost">
            {i18n._('Test Probe')}
          </Button>
        </Box>
        <Box mb="3x">
          <ZProbeDiagram
            clearanceZ={clearanceZ} endZ={endZ} feedrate={feedrate}
            startZ={startZ} units={units}
          />
        </Box>
        <Box display="grid" gap="3x" gridTemplateColumns="repeat(2, minmax(0, 1fr))">
          <NumberField
            disabled={isProbing}
            error={validationErrors.startZ}
            id="autolevel-start-z"
            label={i18n._('Start Z')}
            min={-1000}
            onChange={onStartZChange}
            step={step}
            unit={displayUnits}
            value={startZ}
          />
          <NumberField
            disabled={isProbing}
            error={validationErrors.endZ}
            id="autolevel-end-z"
            label={i18n._('End Z')}
            min={-1000}
            onChange={onEndZChange}
            step={step}
            unit={displayUnits}
            value={endZ}
          />
          <NumberField
            disabled={isProbing}
            error={validationErrors.feedrate}
            id="autolevel-feedrate"
            label={i18n._('Probe Feedrate')}
            min={1}
            onChange={onProbeFeedrateChange}
            step={1}
            unit={feedrateUnits}
            value={feedrate}
          />
          <NumberField
            disabled={isProbing}
            error={validationErrors.clearanceZ}
            id="autolevel-clearance-z"
            label={i18n._('Clearance Z')}
            min={0}
            onChange={onClearanceZChange}
            step={step}
            unit={displayUnits}
            value={clearanceZ}
          />
        </Box>
      </Box>
      <Box className={styles.section}>
        <Text className={styles.sectionTitle}>{i18n._('Probe Area')}</Text>
        <Text color="text.secondary" textAlign="center">
          {i18n._('{{count}} points', { count: totalPoints })}
        </Text>
        <ProbeAreaDiagram
          endX={endX}
          endY={endY}
          scanDirection={scanDirection}
          scanPattern={scanPattern}
          startX={startX}
          startY={startY}
          stepX={stepX}
          stepY={stepY}
          units={units}
        />
        <Box display="grid" gap="3x" gridTemplateColumns="repeat(2, minmax(0, 1fr))">
          <NumberField
            disabled={isProbing}
            error={validationErrors.startX}
            id="autolevel-start-x"
            label={i18n._('Start X')}
            min={-1000}
            name="startX"
            onBlur={onProbeAreaBlur}
            onChange={onStartXChange}
            onFocus={onInputFocus}
            step={step}
            unit={displayUnits}
            value={startX}
          />
          <NumberField
            disabled={isProbing}
            error={validationErrors.startY}
            id="autolevel-start-y"
            label={i18n._('Start Y')}
            min={-1000}
            name="startY"
            onBlur={onProbeAreaBlur}
            onChange={onStartYChange}
            onFocus={onInputFocus}
            step={step}
            unit={displayUnits}
            value={startY}
          />
          <NumberField
            disabled={isProbing}
            error={validationErrors.endX}
            id="autolevel-end-x"
            label={i18n._('End X')}
            min={-1000}
            name="endX"
            onBlur={onProbeAreaBlur}
            onChange={onEndXChange}
            onFocus={onInputFocus}
            step={step}
            unit={displayUnits}
            value={endX}
          />
          <NumberField
            disabled={isProbing}
            error={validationErrors.endY}
            id="autolevel-end-y"
            label={i18n._('End Y')}
            min={-1000}
            name="endY"
            onBlur={onProbeAreaBlur}
            onChange={onEndYChange}
            onFocus={onInputFocus}
            step={step}
            unit={displayUnits}
            value={endY}
          />
          <NumberField
            disabled={isProbing}
            error={validationErrors.stepX}
            id="autolevel-step-x"
            label={i18n._('Step X')}
            min={0}
            onChange={onStepXChange}
            step={step}
            unit={displayUnits}
            value={stepX}
          />
          <NumberField
            disabled={isProbing}
            error={validationErrors.stepY}
            id="autolevel-step-y"
            label={i18n._('Step Y')}
            min={0}
            onChange={onStepYChange}
            step={step}
            unit={displayUnits}
            value={stepY}
          />
        </Box>
        <Box
          display="grid" gap="3x" gridTemplateColumns="repeat(2, minmax(0, 1fr))"
          mt="3x"
        >
          <ScanField
            disabled={isProbing}
            help={i18n._('The order in which the probe points are visited. Raster travels every line in one direction. Zigzag alternates line direction, so the head continues from where the previous line ended. Spiral visits the outer boundary first and works inward, or the reverse. Same points, same grid.')}
            items={[
              { value: 'raster', label: i18n._('Raster') },
              { value: 'zigzag', label: i18n._('Zigzag') },
              { value: 'spiral-in', label: i18n._('Spiral In') },
              { value: 'spiral-out', label: i18n._('Spiral Out') },
            ]}
            label={i18n._('Scan Pattern')}
            onChange={onScanPatternChange}
            value={scanPattern}
          />
          <ScanField
            disabled={isProbing}
            help={i18n._('The axis each line travels along. Along X Axis sends every line from Start X to End X. Along Y Axis sends every line from Start Y to End Y.')}
            items={[
              { value: 'x', label: i18n._('Along X Axis') },
              { value: 'y', label: i18n._('Along Y Axis') },
            ]}
            label={i18n._('Scan Direction')}
            onChange={onScanDirectionChange}
            value={scanDirection}
          />
        </Box>
        <ScanPatternPreview scanDirection={scanDirection} scanPattern={scanPattern} />
      </Box>
      <Box className={styles.section}>
        {isProbing && probeProgress && (
          <Box mt="3x">
            <Text mb="2x">
              {i18n._('Probing progress: {{current}}/{{total}} points', {
                current: probeProgress.current,
                total: probeProgress.total,
              })}
            </Text>
            <LinearProgress
              aria-label={i18n._('Probe progress')}
              max={probeProgress.total}
              value={probeProgress.current}
              variant="determinate"
            />
            <Text color="text.secondary">{probeProgress.percentage}%</Text>
          </Box>
        )}
        {!isProbing ? (
          <Button disabled={!canClick} onClick={onShowStartProbeConfirmation} variant="primary">
            <PlayIcon aria-hidden="true" size="1em" />
            <Space width="1x" />
            {i18n._('Start Probing')}
          </Button>
        ) : (
          <Button onClick={onShowStopProbeConfirmation} variant="danger">
            <StopIcon aria-hidden="true" size="1em" />
            <Space width="1x" />
            {i18n._('Stop Probing')}
          </Button>
        )}
      </Box>
    </Box>
  );
}

export default SetupProbeView;
