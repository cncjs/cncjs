import {
  Box, Button, FormControl, FormErrorMessage, FormInput, FormLabel, FormTextarea,
  Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalOverlay, Space,
} from '@tonic-ui/react';
import Slider from 'rc-slider';
import React from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import i18n from '@app/lib/i18n';
import sliderStyles from '../sliderStyles';

/**
 * @param {{ onSave: (record: object) => void, onCancel: () => void }} props
 * @returns {JSX.Element}
 */
function CreateRecord({ onSave, onCancel }) {
  const form = useForm({
    mode: 'onSubmit',
    defaultValues: { name: '', command: '', grid: 6 },
  });
  const { register, control, formState: { errors } } = form;
  const required = value => Boolean(value.trim()) || i18n._('This field is required.');
  const submit = ({ name, command, grid }) => onSave({ name, command, grid: { xs: grid } });

  return (
    <Modal
      autoFocus ensureFocus closeOnInteractOutside={false}
      isClosable isOpen onClose={onCancel}
      size="sm"
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          {i18n._('Custom Commands')}
          <Space width="2x" />
          &rsaquo;
          <Space width="2x" />
          {i18n._('New')}
        </ModalHeader>
        <FormProvider {...form}>
          <Box as="form" noValidate onSubmit={form.handleSubmit(submit)}>
            <ModalBody>
              <FormControl error={Boolean(errors.name)} mb="4x">
                <FormLabel>{i18n._('Name')}</FormLabel>
                <FormInput aria-label={i18n._('Name')} {...register('name', { validate: required })} />
                <FormErrorMessage errors={errors.name ? [errors.name.message] : []} />
              </FormControl>
              <FormControl error={Boolean(errors.command)} mb="4x">
                <FormLabel>{i18n._('Command')}</FormLabel>
                <FormTextarea aria-label={i18n._('Command')} rows={5} {...register('command', { validate: required })} />
                <FormErrorMessage errors={errors.command ? [errors.command.message] : []} />
              </FormControl>
              <FormControl>
                <FormLabel>{i18n._('Button Width')}</FormLabel>
                <Box sx={sliderStyles}>
                  <Controller
                    name="grid"
                    control={control}
                    render={({ field }) => (
                      <Slider
                        ariaLabelForHandle={i18n._('Button width')} value={field.value} min={1}
                        max={12} step={1} dots
                        included={false} onChange={field.onChange}
                      />
                    )}
                  />
                </Box>
              </FormControl>
            </ModalBody>
            <ModalFooter gap="2x">
              <Button type="button" onClick={onCancel}>{i18n._('Cancel')}</Button>
              <Button type="submit" variant="primary">{i18n._('OK')}</Button>
            </ModalFooter>
          </Box>
        </FormProvider>
      </ModalContent>
    </Modal>
  );
}

export default CreateRecord;
