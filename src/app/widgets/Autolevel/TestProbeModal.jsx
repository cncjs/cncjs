import {
  Box,
  Button,
  Checkbox,
  FormControl,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
} from '@tonic-ui/react';
import React, { useRef, useState } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import i18n from '@app/lib/i18n';
import ZProbeDiagram from './ZProbeDiagram';

/**
 * @param {{canConfirm?: boolean, onCancel?: Function, onConfirm?: Function, value?: object}} props
 */
function TestProbeModal({
  canConfirm = false,
  onCancel = () => {},
  onConfirm = () => {},
  value = {},
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLock = useRef(false);
  const methods = useForm({ defaultValues: { safetyConfirmed: false }, mode: 'onSubmit' });
  const safetyConfirmed = useWatch({ control: methods.control, name: 'safetyConfirmed' });
  const { clearanceZ, startZ, endZ, feedrate, units } = value;

  const submit = () => {
    if (!canConfirm || !methods.getValues('safetyConfirmed') || submitLock.current) {
      return;
    }
    submitLock.current = true;
    setIsSubmitting(true);
    onConfirm();
  };

  return (
    <Modal
      closeOnInteractOutside={false} isClosable isOpen
      onClose={onCancel} size="sm"
    >
      <ModalOverlay />
      <FormProvider {...methods}>
        <ModalContent as="form" noValidate onSubmit={methods.handleSubmit(submit)}>
          <ModalHeader>{i18n._('Test Probe')}</ModalHeader>
          <ModalBody>
            <Text color="error.text" mb="4x">
              {i18n._('The Z-axis will descend until electrical contact is detected. If probe wires are not connected, the tool, workpiece, or machine may be damaged.')}
            </Text>
            <Text mb="4x">{i18n._('A single probe test will be performed at the current XY position.')}</Text>
            <Box mb="4x" width="320px">
              <ZProbeDiagram
                clearanceZ={clearanceZ} endZ={endZ} feedrate={feedrate}
                startZ={startZ} units={units}
              />
            </Box>
            <Controller
              name="safetyConfirmed"
              rules={{ required: true }}
              render={({ field }) => (
                <FormControl>
                  <Checkbox
                    {...field}
                    checked={field.value}
                    onChange={event => field.onChange(event.target.checked)}
                  >
                    {i18n._('I confirm probe wires are correctly connected')}
                  </Checkbox>
                </FormControl>
              )}
            />
          </ModalBody>
          <ModalFooter>
            <Button onClick={onCancel} variant="secondary">{i18n._('Cancel')}</Button>
            <Button disabled={!canConfirm || !safetyConfirmed || isSubmitting} type="submit" variant="primary">
              {i18n._('Start Test Probe')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </FormProvider>
    </Modal>
  );
}

export default TestProbeModal;
