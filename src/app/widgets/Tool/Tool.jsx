import { faCopy } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { EditIcon } from '@tonic-ui/react-icons';
import {
  Box, Button, ButtonGroup, FormControl, FormInput, FormLabel, FormTextarea,
  InputGroup, InputGroupAddon, InputGroupAppend, InputGroupPrepend,
  Dropdown, DropdownButton, Text, Tooltip,
} from '@tonic-ui/react';
import { ensureNumber, ensureString } from 'ensure-type';
import _isEqual from 'lodash/isEqual';
import React, { useEffect, useRef, useState } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { METRIC_UNITS } from '@app/constants';
import { GRBL, MARLIN, SMOOTHIE, TINYG } from '@app/constants/controller';
import i18n from '@app/lib/i18n';
import { mapValueToUnits } from '@app/lib/units';
import {
  TOOL_CHANGE_POLICY_IGNORE_M6_COMMANDS,
  TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_CUSTOM_PROBING,
  TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_TLO,
  TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_WCS,
  TOOL_CHANGE_POLICY_SEND_M6_COMMANDS,
} from './constants';
import iconPin from './images/pin.svg';
import insertAtCaret from './insertAtCaret';
import variables from './variables';

const positionPinSx = {
  display: 'block',
  width: '14px',
  height: '14px',
  backgroundColor: 'currentColor',
  mask: `url("${iconPin}") center / contain no-repeat`,
  WebkitMask: `url("${iconPin}") center / contain no-repeat`,
};

const TOOL_PROBE_OVERRIDE_WCS_EXAMPLE = `
; Probe the tool
G91 [tool_probe_command] F[tool_probe_feedrate] Z[tool_probe_z - mposz - tool_probe_distance]
; Set coordinate system offset
G10 L20 P[mapWCSToPValue(modal.wcs)] Z[touch_plate_height]
`.trim();
const TOOL_PROBE_OVERRIDE_TLO_EXAMPLE = `
; Probe the tool
G91 [tool_probe_command] F[tool_probe_feedrate] Z[tool_probe_z - mposz - tool_probe_distance]
; Pause for 1 second
%wait 1
; Set tool length offset
G43.1 Z[posz - touch_plate_height]
`.trim();

const copyToClipboard = value => {
  const el = document.createElement('textarea');
  el.value = value;
  el.setAttribute('readonly', '');
  el.style.position = 'absolute';
  el.style.left = '-9999px';
  document.body.appendChild(el);
  const selected = document.getSelection().rangeCount > 0 ? document.getSelection().getRangeAt(0) : false;
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
  if (selected) {
    document.getSelection().removeAllRanges();
    document.getSelection().addRange(selected);
  }
};

export const getToolProbeCommands = (controllerType, toolChangePolicy) => {
  const lines = ['; Probe the tool'];
  if (controllerType === MARLIN) {
    lines.push('G91 [tool_probe_command] F[tool_probe_feedrate] Z[tool_probe_z - posz - tool_probe_distance]');
    if (toolChangePolicy === TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_WCS) {
      lines.push('; Set the current work Z position (posz) to the touch plate height');
      lines.push('G92 Z[touch_plate_height]');
    } else if (toolChangePolicy === TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_TLO) {
      lines.push('; Pause for 1 second');
      lines.push('%wait 1');
      lines.push('; Adjust the work Z position by subtracting the touch plate height from the current work Z position (posz)');
      lines.push('G92 Z[posz - touch_plate_height]');
    }
    return lines.join('\n');
  }
  if ([GRBL, SMOOTHIE, TINYG].includes(controllerType)) {
    lines.push('G91 [tool_probe_command] F[tool_probe_feedrate] Z[tool_probe_z - mposz - tool_probe_distance]');
    if (toolChangePolicy === TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_WCS) {
      lines.push('; Set coordinate system offset');
      lines.push('G10 L20 P[mapWCSToPValue(modal.wcs)] Z[touch_plate_height]');
    } else if (toolChangePolicy === TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_TLO) {
      lines.push('; Pause for 1 second');
      lines.push('%wait 1');
      lines.push('; Set tool length offset');
      lines.push(controllerType === TINYG ? '{tofz:[posz - touch_plate_height]}' : 'G43.1 Z[posz - touch_plate_height]');
    }
    return lines.join('\n');
  }
  return '';
};

const policyOptions = [
  [TOOL_CHANGE_POLICY_IGNORE_M6_COMMANDS, 'Ignore M6 commands (Default)'],
  [TOOL_CHANGE_POLICY_SEND_M6_COMMANDS, 'Send M6 commands'],
  [TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_WCS, 'Manual Tool Change (WCS)'],
  [TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_TLO, 'Manual Tool Change (TLO)'],
  [TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_CUSTOM_PROBING, 'Manual Tool Change (Custom Probing)'],
];

/**
 * @param {object} props
 * @param {boolean} [props.canClick]
 * @param {boolean} [props.connected]
 * @param {object} [props.controller]
 * @param {object} [props.machinePosition]
 * @param {string} [props.units]
 * @param {object} [props.value]
 * @param {Function} [props.onChange]
 */
function Tool({
  canClick = false,
  connected = false,
  controller = {},
  machinePosition = {},
  units = METRIC_UNITS,
  value = null,
  onChange = () => {},
}) {
  const [editable, setEditable] = useState(false);
  const [customCommands, setCustomCommands] = useState('');
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef(null);
  const timerRef = useRef(null);
  const isResettingRef = useRef(false);
  const methods = useForm({
    defaultValues: value ?? {},
    mode: 'onSubmit',
    resetOptions: { keepDirtyValues: true },
  });
  const { getValues, reset: resetForm, setValue, watch } = methods;

  useEffect(() => () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }, []);

  useEffect(() => {
    // Adopt an externally accepted value (e.g. a unit conversion or a refreshed
    // configuration) without discarding fields the user has already modified.
    if (!value) {
      return;
    }
    if (_isEqual(getValues(), value)) {
      return;
    }
    isResettingRef.current = true;
    resetForm(value, { keepDirtyValues: true });
    isResettingRef.current = false;

    // Report the values that survived the reset, otherwise the owner would keep
    // the externally accepted value for a field the user has already modified.
    const nextValues = getValues();
    if (!_isEqual(nextValues, value)) {
      onChange(nextValues);
    }
  }, [value, getValues, resetForm, onChange]);

  useEffect(() => {
    const subscription = watch(nextValues => {
      if (isResettingRef.current) {
        return;
      }
      onChange(nextValues);
    });
    return () => subscription.unsubscribe();
  }, [watch, onChange]);

  if (!value) {
    return <Box color="text.secondary">{i18n._('No available tool configuration')}</Box>;
  }

  const displayUnits = units === METRIC_UNITS ? i18n._('mm') : i18n._('in');
  const feedrateUnits = units === METRIC_UNITS ? i18n._('mm/min') : i18n._('in/min');
  const step = units === METRIC_UNITS ? 1 : 1 / 16;
  const policy = value.toolChangePolicy;
  const isManual = [
    TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_WCS,
    TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_TLO,
    TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_CUSTOM_PROBING,
  ].includes(policy);
  const isDefaultProbe = [
    TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_WCS,
    TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_TLO,
  ].includes(policy);
  const isCustomProbe = policy === TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_CUSTOM_PROBING;
  const commands = getToolProbeCommands(controller.type, policy);

  const numberField = (name, label, unit, getNextValue) => (
    <Controller
      name={name}
      render={({ field }) => (
        <FormControl>
          <FormLabel>{label}</FormLabel>
          <InputGroup>
            <FormInput
              {...field}
              aria-label={label}
              flex="1"
              minWidth="0"
              min={0}
              step={step}
              type="number"
              value={field.value ?? ''}
              onChange={event => field.onChange(getNextValue(event.target.value))}
            />
            <InputGroupAppend>
              <InputGroupAddon>{unit}</InputGroupAddon>
            </InputGroupAppend>
          </InputGroup>
        </FormControl>
      )}
    />
  );

  return (
    <FormProvider {...methods}>
      <Box>
        <Box mb="4x">
          <Controller
            name="toolChangePolicy"
            render={({ field }) => (
              <FormControl>
                <FormLabel>{i18n._('Tool Change Policy')}</FormLabel>
                <Dropdown
                  matchWidth
                  items={policyOptions.map(([option, label]) => ({ value: option, label: i18n._(label) }))}
                  value={field.value === null || field.value === undefined
                    ? null
                    : policyOptions.map(([option, label]) => ({ value: option, label: i18n._(label) }))
                      .find(option => Number(option.value) === Number(field.value)) || null}
                  renderItem={option => option?.label ?? ''}
                  renderToggle={({ renderItem, value: selected }) => (
                    <DropdownButton
                      aria-label={i18n._('Tool Change Policy')}
                      width="100%"
                      variant="secondary"
                    >
                      {renderItem(selected)}
                    </DropdownButton>
                  )}
                  onChange={option => field.onChange(ensureNumber(option?.value))}
                />
                {policy === TOOL_CHANGE_POLICY_IGNORE_M6_COMMANDS && <Text fontStyle="italic">{i18n._('This option skips the M6 command and pauses controller operations, giving you full manual control over the tool change process.')}</Text>}
                {policy === TOOL_CHANGE_POLICY_SEND_M6_COMMANDS && <Text fontStyle="italic">{i18n._('This will send the line exactly as it is to the controller.')}</Text>}
              </FormControl>
            )}
          />
        </Box>
        {isManual && (
          <Box>
            <FormControl mb="4x">
              <FormLabel>{i18n._('Tool Change Position')}</FormLabel>
              {['x', 'y', 'z'].map(axis => (
                <Controller
                  key={axis}
                  name={`toolChange${axis.toUpperCase()}`}
                  render={({ field }) => (
                    <InputGroup mb="2x">
                      <InputGroupPrepend>
                        <InputGroupAddon>{axis.toUpperCase()}</InputGroupAddon>
                      </InputGroupPrepend>
                      <FormInput
                        {...field}
                        aria-label={i18n._(`Tool Change ${axis.toUpperCase()}`)}
                        flex="1"
                        minWidth="0"
                        type="number"
                        value={field.value ?? ''}
                      />
                      <InputGroupAppend>
                        <InputGroupAddon>{displayUnits}</InputGroupAddon>
                      </InputGroupAppend>
                      <InputGroupAppend>
                        <Button
                          aria-label={i18n._(`Use machine ${axis.toUpperCase()} position`)}
                          disabled={!canClick}
                          onClick={() => machinePosition[axis] !== undefined && field.onChange(machinePosition[axis])}
                          variant="secondary"
                        >
                          <Box as="span" aria-hidden="true" sx={positionPinSx} />
                        </Button>
                      </InputGroupAppend>
                    </InputGroup>
                  )}
                />
              ))}
            </FormControl>
            <FormControl mb="4x">
              <FormLabel>{i18n._('Tool Probe Position')}</FormLabel>
              {['x', 'y', 'z'].map(axis => (
                <Controller
                  key={axis}
                  name={`toolProbe${axis.toUpperCase()}`}
                  render={({ field }) => (
                    <InputGroup mb="2x">
                      <InputGroupPrepend>
                        <InputGroupAddon>{axis.toUpperCase()}</InputGroupAddon>
                      </InputGroupPrepend>
                      <FormInput
                        {...field}
                        aria-label={i18n._(`Tool Probe ${axis.toUpperCase()}`)}
                        flex="1"
                        minWidth="0"
                        type="number"
                        value={field.value ?? ''}
                      />
                      <InputGroupAppend>
                        <InputGroupAddon>{displayUnits}</InputGroupAddon>
                      </InputGroupAppend>
                      <InputGroupAppend>
                        <Button
                          aria-label={i18n._(`Use machine probe ${axis.toUpperCase()} position`)}
                          disabled={!canClick}
                          onClick={() => machinePosition[axis] !== undefined && field.onChange(machinePosition[axis])}
                          variant="secondary"
                        >
                          <Box as="span" aria-hidden="true" sx={positionPinSx} />
                        </Button>
                      </InputGroupAppend>
                    </InputGroup>
                  )}
                />
              ))}
            </FormControl>
            {isCustomProbe && (
              <FormControl mb="4x">
                <Box alignItems="center" display="flex" gap="2x">
                  <FormLabel>{i18n._('Custom Tool Probe Commands')}</FormLabel>
                  {!editable && (
                    <Button
                      aria-label={i18n._('Edit custom tool probe commands')} onClick={() => {
                        setCustomCommands(ensureString(value.toolProbeCustomCommands)); setEditable(true);
                      }} size="sm"
                      variant="ghost"
                    ><EditIcon aria-hidden="true" size="1em" />
                    </Button>
                  )}
                </Box>
                {!editable && ensureString(value.toolProbeCustomCommands).length > 0 && (
                  <Text
                    as="pre"
                    backgroundColor="background.low"
                    border="1px solid"
                    borderColor="border.primary"
                    borderRadius="sm"
                    m="0"
                    p="3x"
                    maxHeight="150px"
                    overflow="auto"
                  >
                    {value.toolProbeCustomCommands}
                  </Text>
                )}
                {!editable && ensureString(value.toolProbeCustomCommands).length === 0 && <Text color="error.text">{i18n._('Warning: No custom tool probe commands are defined')}</Text>}
                {editable && (
                  <Box>
                    <Box mb="2x">
                      <Button onClick={() => setCustomCommands(TOOL_PROBE_OVERRIDE_WCS_EXAMPLE)} size="sm" variant="secondary">WCS</Button>
                      <Button
                        ml="2x" onClick={() => setCustomCommands(TOOL_PROBE_OVERRIDE_TLO_EXAMPLE)} size="sm"
                        variant="secondary"
                      >TLO
                      </Button>
                      <Dropdown
                        items={variables.map(variable => (typeof variable === 'object' ? (
                          {
                            value: variable.text,
                            type: 'custom',
                            content: (
                              <Text
                                key={variable.text} color="text.secondary" px="3x"
                                py="2x"
                              >{variable.text}
                              </Text>
                            ),
                          }
                        ) : (
                          {
                            value: variable,
                            content: variable,
                            props: {
                              key: variable,
                              onClick: () => {
                                const textarea = textareaRef.current; if (textarea) {
                                  insertAtCaret(textarea, variable); setCustomCommands(textarea.value);
                                }
                              },
                            },
                          }
                        )))}
                        renderItem={item => item?.content}
                        renderToggle={() => (
                          <DropdownButton ml="2x" size="sm" variant="secondary">
                            {i18n._('Insert variable')}
                          </DropdownButton>
                        )}
                      />
                    </Box>
                    <FormTextarea
                      aria-label={i18n._('Custom Tool Probe Commands')} ref={textareaRef} value={customCommands}
                      onChange={event => setCustomCommands(event.target.value)} minHeight="150px" resize="vertical"
                    />
                    <Box display="flex" gap="2x" mt="2x">
                      <Button
                        aria-label={i18n._('Save custom tool probe commands')} onClick={() => {
                          setValue('toolProbeCustomCommands', customCommands, { shouldDirty: true }); setEditable(false);
                        }} variant="primary"
                      >{i18n._('OK')}
                      </Button>
                      <Button
                        aria-label={i18n._('Cancel custom tool probe commands')} onClick={() => {
                          setCustomCommands(ensureString(value.toolProbeCustomCommands)); setEditable(false);
                        }} variant="secondary"
                      >{i18n._('Cancel')}
                      </Button>
                    </Box>
                  </Box>
                )}
              </FormControl>
            )}
            {isDefaultProbe && (
              <Box>
                <Controller
                  name="toolProbeCommand"
                  render={({ field }) => (
                    <FormControl mb="4x">
                      <FormLabel>{i18n._('Probe Command')}</FormLabel>
                      <ButtonGroup size="sm">
                        {['G38.2', 'G38.3', 'G38.4', 'G38.5'].map(command => (
                          <Button
                            key={command}
                            onClick={() => field.onChange(command)}
                            selected={field.value === command}
                          >
                            {command}
                          </Button>
                        ))}
                      </ButtonGroup>
                    </FormControl>
                  )}
                />
                <Box
                  display="grid" gap="4x" gridTemplateColumns="repeat(2, minmax(0, 1fr))"
                  mb="4x"
                >
                  {numberField('toolProbeDistance', i18n._('Probe Distance'), displayUnits, raw => (ensureNumber(raw) > 0 ? ensureNumber(raw) : mapValueToUnits(1, units)))}
                  {numberField('toolProbeFeedrate', i18n._('Probe Feedrate'), feedrateUnits, raw => (ensureNumber(raw) > 0 ? raw : mapValueToUnits(10, units)))}
                  {numberField('touchPlateHeight', i18n._('Touch Plate Height'), displayUnits, raw => raw)}
                </Box>
                <FormControl>
                  <Box alignItems="center" display="flex" gap="2x">
                    <FormLabel>{i18n._('Tool Probe Commands')}</FormLabel>
                    {connected && (
                      <Tooltip label={copied ? i18n._('Copied') : i18n._('Copy')}>
                        <Button
                          aria-label={i18n._('Copy tool probe commands')}
                          onClick={() => {
                            copyToClipboard(commands);
                            setCopied(true);
                            if (timerRef.current) {
                              clearTimeout(timerRef.current);
                            }
                            timerRef.current = setTimeout(() => {
                              timerRef.current = null;
                              setCopied(false);
                            }, 1500);
                          }}
                          size="sm"
                          variant="ghost"
                        >
                          <FontAwesomeIcon aria-hidden="true" icon={faCopy} />
                        </Button>
                      </Tooltip>
                    )}
                  </Box>
                  {connected ? (
                    <Text
                      as="pre"
                      backgroundColor="background.low"
                      border="1px solid"
                      borderColor="border.primary"
                      borderRadius="sm"
                      m="0"
                      p="3x"
                      maxHeight="150px"
                      overflow="auto"
                    >
                      {commands}
                    </Text>
                  ) : <Text fontStyle="italic">{i18n._('Connect to the controller to view the tool probe commands.')}</Text>}
                </FormControl>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </FormProvider>
  );
}

export default Tool;
