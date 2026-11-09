import {
  Box,
  Button,
  ButtonGroup,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
} from '@tonic-ui/react';
import React, { useRef } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import CodePreview from '@app/components/CodePreview';
import controller from '@app/lib/controller';
import i18n from '@app/lib/i18n';
import useWidgetConfig from '@app/widgets/shared/useWidgetConfig';
import {
  populateTLOProbeCommands,
  populateWCSProbeCommands,
} from './utils';

const PROBE_SETTER_TLO = 'tlo';
const PROBE_SETTER_WCS = 'wcs';

/**
 * @param {object} props
 * @param {boolean} [props.isOpen]
 * @param {Function} props.onClose
 * @param {object} props.probeData
 */
function ProbeModal({
  isOpen = true,
  onClose,
  probeData,
}) {
  const config = useWidgetConfig();
  const contentRef = useRef();
  const {
    probeAxis,
    probeCommand,
    probeDepth,
    probeFeedrate,
    touchPlateHeight,
    retractionDistance,
    wcs,
  } = probeData;
  const initialValues = {
    probeSetter: !!config.get('useTLO') ? PROBE_SETTER_TLO : PROBE_SETTER_WCS,
  };
  const methods = useForm({ defaultValues: initialValues, mode: 'onSubmit' });
  const submit = () => {
    controller.command('gcode', contentRef.current);
    onClose();
  };

  return (
    <Modal
      autoFocus
      closeOnEsc
      closeOnInteractOutside={false}
      ensureFocus
      isClosable
      isOpen={isOpen}
      size="sm"
      onClose={onClose}
    >
      <ModalOverlay />
      <FormProvider {...methods}>
        <ModalContent as="form" noValidate onSubmit={methods.handleSubmit(submit)}>
          <ModalHeader>{i18n._('Probe')}</ModalHeader>
          <ModalBody>
            <Controller
              name="probeSetter" render={({ field: input }) => {
                const handleClickTLO = (event) => {
                  input.onChange(PROBE_SETTER_TLO);

                  config.set('useTLO', true);
                };
                const handleClickWCS = (event) => {
                  input.onChange(PROBE_SETTER_WCS);

                  config.set('useTLO', false);
                };
                const probeSetter = input.value;

                let probeCommands = [];
                if (probeSetter === PROBE_SETTER_TLO) {
                  probeCommands = populateTLOProbeCommands({
                    probeAxis,
                    probeCommand,
                    probeDepth,
                    probeFeedrate,
                    touchPlateHeight,
                    retractionDistance,
                  });
                } else if (probeSetter === PROBE_SETTER_WCS) {
                  probeCommands = populateWCSProbeCommands({
                    probeAxis,
                    probeCommand,
                    probeDepth,
                    probeFeedrate,
                    touchPlateHeight,
                    retractionDistance,
                    wcs,
                  });
                }

                const content = probeCommands.join('\n');
                contentRef.current = content;

                return (
                  <>
                    <Box mb="4x">
                      <ButtonGroup
                        size="sm"
                        sx={{ minWidth: '50%' }}
                      >
                        <Button
                          selected={probeSetter === PROBE_SETTER_TLO}
                          onClick={handleClickTLO}
                        >
                          {i18n._('Tool Length Offset')}
                        </Button>
                        <Button
                          selected={probeSetter === PROBE_SETTER_WCS}
                          onClick={handleClickWCS}
                        >
                          {i18n._('Work Coordinate System')}
                        </Button>
                      </ButtonGroup>
                    </Box>
                    <CodePreview
                      data={content}
                      language="gcode"
                    />
                  </>
                );
              }}
            />
          </ModalBody>
          <ModalFooter>
            <Button
              onClick={onClose}
            >
              {i18n._('Cancel')}
            </Button>
            <Button
              variant="primary"
              type="submit"
            >
              {i18n._('Run Probe')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </FormProvider>
    </Modal>
  );
}

export default ProbeModal;
