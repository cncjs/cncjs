import {
  Box, Button, Dropdown, DropdownButton, Flex, FormControl, FormErrorMessage,
  FormHelperText, FormInput, FormLabel, Modal, ModalBody, ModalContent,
  ModalFooter, ModalHeader, ModalOverlay, Text,
} from '@tonic-ui/react';
import React, { useId } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import i18n from '@app/lib/i18n';
import {
  DEFAULT_FONT_STACK, FONT_SIZES, TERMINAL_COLS_MIN, TERMINAL_COLS_MAX,
  TERMINAL_ROWS_MIN, TERMINAL_ROWS_MAX,
} from './constants';
import { buildTerminalTheme } from './terminal-theme';

/** @param {{ name: string, label: string, items: object[] }} props */
function SettingChoice({ name, label, items }) {
  const id = useId();
  return (
    <FormControl mb="4x">
      <FormLabel htmlFor={id}>{label}</FormLabel>
      <Controller
        name={name}
        render={({ field }) => (
          <Dropdown
            portalled
            items={items}
            value={items.find(item => item.value === field.value)}
            renderItem={item => item.label}
            onChange={item => field.onChange(item.value)}
            renderToggle={({ value }) => (
              <DropdownButton
                id={id} aria-label={label} width="100%"
                variant="secondary"
              >
                {value.label}
              </DropdownButton>
            )}
          />
        )}
      />
    </FormControl>
  );
}

/** @param {{ values: object, onSave: (values: object) => ?string, onClose: Function }} props */
function SettingsModal({ values, onSave, onClose }) {
  const form = useForm({ defaultValues: values, mode: 'onSubmit' });
  const draft = useWatch({ control: form.control });
  const theme = buildTerminalTheme(draft.background, draft.textColor);
  const { errors } = form.formState;
  const submit = data => {
    const error = onSave({ ...data, cols: Number(data.cols), rows: Number(data.rows) });
    if (error) {
      form.setError('root.server', { message: error });
    } else {
      onClose();
    }
  };
  const sizeHint = i18n._('Normal view uses these values. Fullscreen fits the available space.');

  return (
    <Modal
      autoFocus
      closeOnEsc
      closeOnInteractOutside={false}
      ensureFocus
      isClosable
      isOpen
      size="md"
      onClose={onClose}
    >
      <ModalOverlay />
      <FormProvider {...form}>
        <ModalContent
          aria-label={i18n._('Console Settings')} as="form" noValidate
          onSubmit={form.handleSubmit(submit)}
        >
          <ModalHeader>{i18n._('Console Settings')}</ModalHeader>
          <ModalBody>
            <Box
              aria-label={i18n._('Terminal preview')}
              mb="4x" p="3x" border="1px solid"
              borderColor="border.secondary"
              style={{
                fontFamily: DEFAULT_FONT_STACK,
                fontSize: draft.fontSize,
                lineHeight: 1.2,
                letterSpacing: 1,
                backgroundColor: theme.background,
                color: theme.foreground,
              }}
            >
              <Box>{'> $$'}</Box>
              <Box>$0=10</Box>
              <Box>{'> '}<Box as="span" style={{ backgroundColor: theme.cursor, color: theme.cursorAccent }}>&nbsp;</Box></Box>
            </Box>
            <SettingChoice
              name="fontSize" label={i18n._('Font size')}
              items={FONT_SIZES.map(value => ({ value, label: String(value) }))}
            />
            <Flex columnGap="3x">
              <Box flex={1} minWidth={0}>
                <SettingChoice
                  name="background" label={i18n._('Background color')}
                  items={[{ value: 'black', label: i18n._('Black') }, { value: 'white', label: i18n._('White') }]}
                />
              </Box>
              <Box flex={1} minWidth={0}>
                <SettingChoice
                  name="textColor" label={i18n._('Text color')}
                  items={[
                    { value: 'default', label: i18n._('Default') },
                    { value: 'green', label: i18n._('Green') },
                    { value: 'amber', label: i18n._('Amber') },
                    { value: 'cyan', label: i18n._('Cyan') },
                  ]}
                />
              </Box>
            </Flex>
            <Flex columnGap="3x">
              {[
                { name: 'cols', label: i18n._('Columns'), min: TERMINAL_COLS_MIN, max: TERMINAL_COLS_MAX },
                { name: 'rows', label: i18n._('Rows'), min: TERMINAL_ROWS_MIN, max: TERMINAL_ROWS_MAX },
              ].map(({ name, label, min, max }) => (
                <FormControl
                  key={name} error={Boolean(errors[name])} flex={1}
                  minWidth={0}
                >
                  <FormLabel>{label}</FormLabel>
                  <FormInput
                    aria-label={label} inputMode="numeric"
                    {...form.register(name, {
                      validate: value => (/^\d+$/.test(String(value).trim()) && Number(value) >= min && Number(value) <= max) ||
                        i18n._('Enter a number between {{min}} and {{max}}', { min, max }),
                    })}
                  />
                  <FormErrorMessage errors={errors[name] ? [errors[name].message] : []} />
                </FormControl>
              ))}
            </Flex>
            <FormHelperText mt="2x">{sizeHint}</FormHelperText>
            {errors.root?.server && <Text role="alert" color="error._onOverlay.text" mt="3x">{errors.root.server.message}</Text>}
          </ModalBody>
          <ModalFooter columnGap="2x">
            <Button onClick={onClose}>{i18n._('Cancel')}</Button>
            <Button type="submit" variant="primary">{i18n._('Save Changes')}</Button>
          </ModalFooter>
        </ModalContent>
      </FormProvider>
    </Modal>
  );
}

export default SettingsModal;
