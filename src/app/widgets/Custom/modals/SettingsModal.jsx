import {
  Box,
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  TextLabel,
} from '@tonic-ui/react';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import useWidgetConfig from '@app/widgets/shared/useWidgetConfig';
import i18n from '@app/lib/i18n';

/**
 * @param {object} props
 * @param {Function} props.onClose
 */
function SettingsModal({
  onClose,
}) {
  const config = useWidgetConfig();
  const initialValues = {
    title: config.get('title'),
    url: config.get('url'),
  };
  const methods = useForm({ defaultValues: initialValues, mode: 'onSubmit' });
  const { register, formState: { errors, isSubmitting } } = methods;
  const submit = (values) => {
    try {
      config.set('title', values.title);
      config.set('url', values.url);
      onClose();
    } catch (error) {
      methods.setError('root', { type: 'server', message: error.message });
    }
  };

  return (
    <Modal
      autoFocus
      closeOnEsc
      closeOnInteractOutside={false}
      ensureFocus
      isClosable
      isOpen
      size="sm"
      onClose={onClose}
    >
      <ModalOverlay data-testid="settings-modal-overlay" />
      <FormProvider {...methods}>
        <ModalContent as="form" noValidate onSubmit={methods.handleSubmit(submit)}>
          <ModalHeader>{i18n._('Settings')}</ModalHeader>
          <ModalBody>
            <Box mb="4x">
              <TextLabel htmlFor="custom-settings-title" mb="2x">
                {i18n._('Title')}
              </TextLabel>
              <Input
                {...register('title')} id="custom-settings-title" type="url"
                maxLength={256}
              />
            </Box>
            <Box mb="4x">
              <TextLabel htmlFor="custom-settings-url" mb="2x">
                {i18n._('URL')}
              </TextLabel>
              <Input
                {...register('url')} id="custom-settings-url" type="url"
                placeholder="/widget/"
              />
            </Box>
          </ModalBody>
          <ModalFooter>
            {errors.root && (
              <Text fontSize="sm" lineHeight="sm" color="error.text">
                {errors.root.message}
              </Text>
            )}
            <Button onClick={onClose}>
              {i18n._('Cancel')}
            </Button>
            <Button
              variant="primary"
              disabled={isSubmitting}
              type="submit"
            >
              {i18n._('Save Changes')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </FormProvider>
    </Modal>
  );
}

export default SettingsModal;
