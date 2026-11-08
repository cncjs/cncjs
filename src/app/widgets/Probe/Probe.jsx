import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Box,
  Button,
  ButtonGroup,
  FormControl,
  FormHelperText,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupAppend,
  Space,
  TextLabel,
  Tooltip,
} from '@tonic-ui/react';
import { useConst } from '@tonic-ui/react-hooks';
import _get from 'lodash/get';
import _includes from 'lodash/includes';
import _isEqual from 'lodash/isEqual';
import React, { useEffect, useState } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { connect } from 'react-redux';
import { IMPERIAL_UNITS, METRIC_UNITS } from '@app/constants';
import { CONNECTION_STATE_CONNECTED } from '@app/constants/connection';
import { MACHINE_STATE_NONE, REFORMED_MACHINE_STATE_IDLE } from '@app/constants/controller';
import { WORKFLOW_STATE_IDLE } from '@app/constants/workflow';
import i18n from '@app/lib/i18n';
import { in2mm, mapValueToUnits } from '@app/lib/units';
import useWidgetConfig from '@app/widgets/shared/useWidgetConfig';
import { composeValidators, minValue, required } from '@app/widgets/shared/validations';
import ProbeModal from './modals/ProbeModal';

const mapProbeCommandToDescription = probeCommand => ({
  'G38.2': i18n._('G38.2 probe toward workpiece, stop on contact, signal error if failure'),
  'G38.3': i18n._('G38.3 probe toward workpiece, stop on contact'),
  'G38.4': i18n._('G38.4 probe away from workpiece, stop on loss of contact, signal error if failure'),
  'G38.5': i18n._('G38.5 probe away from workpiece, stop on loss of contact'),
}[probeCommand] || '');

const NUMBER_FIELD_NAMES = [
  'probeDepth',
  'probeFeedrate',
  'touchPlateHeight',
  'retractionDistance',
];

const validateNumberField = composeValidators(required, minValue(0));

const getInitialValues = (config, units) => ({
  probeAxis: config.get('probeAxis', 'Z'),
  probeCommand: config.get('probeCommand', 'G38.2'),
  probeDepth: mapValueToUnits(config.get('probeDepth'), units),
  probeFeedrate: mapValueToUnits(config.get('probeFeedrate'), units),
  touchPlateHeight: mapValueToUnits(config.get('touchPlateHeight'), units),
  retractionDistance: mapValueToUnits(config.get('retractionDistance'), units),
});

/**
 * @param {object} props
 * @param {boolean} props.isActionable
 * @param {string} props.units
 * @param {string} props.wcs
 */
function Probe({ isActionable, units, wcs }) {
  const config = useWidgetConfig();
  const defaultValues = useConst(() => getInitialValues(config, units));
  const displayUnits = units === METRIC_UNITS ? i18n._('mm') : i18n._('in');
  const feedrateUnits = units === METRIC_UNITS ? i18n._('mm/min') : i18n._('in/min');
  const step = units === METRIC_UNITS ? 1 : 0.1;
  // Render the modal inside this widget's provider subtree instead of a separate
  // React root, so `WidgetConfigProvider` and the tracked config state stay available.
  const [probeModal, setProbeModal] = useState({ isOpen: false, probeData: null });
  const openProbeModal = probeData => {
    setProbeModal({ isOpen: true, probeData });
  };
  const closeProbeModal = () => {
    setProbeModal(prevState => ({ ...prevState, isOpen: false }));
  };
  const methods = useForm({
    defaultValues,
    mode: 'onSubmit',
  });
  const { formState, getValues, handleSubmit, register, reset } = methods;
  const values = useWatch({ control: methods.control });
  const { errors, touchedFields } = formState;
  const probeAxis = _get(values, 'probeAxis');
  const isInvalid = NUMBER_FIELD_NAMES.some(name => !!validateNumberField(_get(values, name)));

  useEffect(() => {
    // The draft lives in metric units, so re-initialize it whenever the controller
    // switches between metric and imperial units (e.g. G21 and G20). `config` is
    // deliberately not a dependency: it is a new frozen object on every render, so
    // depending on it would re-initialize the draft (and re-render) endlessly.
    const resetValues = getInitialValues(config, units);
    if (_isEqual(getValues(), resetValues)) {
      return;
    }
    reset(resetValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units]);

  const handleSubmitForm = submittedValues => {
    const {
      probeAxis,
      probeCommand,
      probeDepth,
      probeFeedrate,
      touchPlateHeight,
      retractionDistance,
    } = submittedValues;
    openProbeModal({
      probeAxis,
      probeCommand,
      probeDepth,
      probeFeedrate,
      touchPlateHeight,
      retractionDistance,
      wcs,
    });
  };

  const renderNumberField = ({ name, label, unit }) => {
    const error = _get(errors, name)?.message;
    const touched = _get(touchedFields, name);
    const changeValue = event => {
      // Keep the draft in sync with the native input, then persist the value in
      // metric units so the stored configuration stays unit-independent.
      const nextValue = event.target.value;
      registerProps.onChange(event);
      const metricValue = Number(units === IMPERIAL_UNITS ? in2mm(nextValue) : nextValue);
      if (Number.isFinite(metricValue) && metricValue >= 0) {
        config.set(name, metricValue);
      }
    };
    const registerProps = register(name, { validate: validateNumberField });

    return (
      <FormControl minWidth="0">
        <TextLabel htmlFor={name} mb="2x">{label}</TextLabel>
        <InputGroup>
          <Input
            {...registerProps}
            aria-label={label}
            flex="1"
            minWidth="0"
            id={name}
            min={0}
            step={step}
            type="number"
            value={_get(values, name) ?? ''}
            onChange={changeValue}
          />
          <InputGroupAppend>
            <InputGroupAddon>{unit}</InputGroupAddon>
          </InputGroupAppend>
        </InputGroup>
        {(error && touched) && <FormHelperText>{error}</FormHelperText>}
      </FormControl>
    );
  };

  return (
    <FormProvider {...methods}>
      <Box>
        <Box mb="4x">
          <Controller
            name="probeAxis"
            render={({ field: input }) => {
              const changeValue = value => () => {
                input.onChange(value);
                config.set('probeAxis', value);
              };

              return (
                <FormControl>
                  <TextLabel mb="2x">{i18n._('Probe Axis')}</TextLabel>
                  <ButtonGroup size="sm" sx={{ minWidth: '50%' }}>
                    {['Z', 'X', 'Y'].map(axis => (
                      <Button
                        key={axis}
                        selected={input.value === axis}
                        title={i18n._(`Probe ${axis} axis`)}
                        onClick={changeValue(axis)}
                      >
                        {axis}
                      </Button>
                    ))}
                  </ButtonGroup>
                </FormControl>
              );
            }}
          />
        </Box>
        <Box mb="4x">
          <Controller
            name="probeCommand"
            render={({ field: input }) => {
              const changeValue = value => () => {
                input.onChange(value);
                config.set('probeCommand', value);
              };

              return (
                <FormControl>
                  <Box alignItems="center" display="flex" mb="2x">
                    <TextLabel>{i18n._('Probe Command: {{probeCommand}}', { probeCommand: input.value })}</TextLabel>
                    <Space width="2x" />
                    <Tooltip label={mapProbeCommandToDescription(input.value)} shouldWrapChildren>
                      <Box
                        as="span"
                        className="fa-layers fa-fw"
                        sx={{ color: 'text.primary', cursor: 'help', opacity: 0.5 }}
                      >
                        <FontAwesomeIcon icon={['far', 'circle']} />
                        <FontAwesomeIcon icon="info" transform="shrink-8" />
                      </Box>
                    </Tooltip>
                  </Box>
                  <ButtonGroup size="sm" sx={{ minWidth: '80%' }}>
                    {['G38.2', 'G38.3', 'G38.4', 'G38.5'].map(command => (
                      <Button
                        key={command}
                        selected={input.value === command}
                        title={mapProbeCommandToDescription(command)}
                        onClick={changeValue(command)}
                      >
                        {command}
                      </Button>
                    ))}
                  </ButtonGroup>
                </FormControl>
              );
            }}
          />
        </Box>
        <Box
          display="grid" gridTemplateColumns="repeat(2, minmax(0, 1fr))" gap="3x"
          mb="4x"
        >
          {renderNumberField({ name: 'probeDepth', label: i18n._('Probe Depth'), unit: displayUnits })}
          {renderNumberField({ name: 'probeFeedrate', label: i18n._('Probe Feedrate'), unit: feedrateUnits })}
          {renderNumberField({ name: 'touchPlateHeight', label: i18n._('Touch Plate Thickness'), unit: displayUnits })}
          {renderNumberField({ name: 'retractionDistance', label: i18n._('Retraction Distance'), unit: displayUnits })}
        </Box>
        <Box mb="2x">
          <Button
            disabled={!isActionable || isInvalid}
            size="md"
            variant="secondary"
            onClick={handleSubmit(handleSubmitForm)}
          >
            {i18n._('Probe Axis {{axis}}', { axis: probeAxis })}
          </Button>
        </Box>
      </Box>
      {probeModal.probeData && (
        <ProbeModal
          isOpen={probeModal.isOpen}
          onClose={closeProbeModal}
          probeData={probeModal.probeData}
        />
      )}
    </FormProvider>
  );
}

export default connect(store => {
  const isActionable = (() => {
    if (_get(store, 'connection.state') !== CONNECTION_STATE_CONNECTED) {
      return false;
    }
    if (_get(store, 'controller.workflow.state') !== WORKFLOW_STATE_IDLE) {
      return false;
    }
    return _includes([
      MACHINE_STATE_NONE,
      REFORMED_MACHINE_STATE_IDLE,
    ], _get(store, 'controller.reformedMachineState'));
  })();
  const modalUnits = _get(store, 'controller.modal.units');
  const units = {
    G20: IMPERIAL_UNITS,
    G21: METRIC_UNITS,
  }[modalUnits];
  const wcs = _get(store, 'controller.modal.wcs') || 'G54';

  return { isActionable, units, wcs };
})(Probe);
