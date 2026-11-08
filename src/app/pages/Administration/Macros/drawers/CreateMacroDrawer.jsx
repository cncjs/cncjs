import {
  Button,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  DrawerOverlay,
  Dropdown,
  DropdownToggle,
  LinkButton,
  MenuGroup,
  Flex,
  Text,
} from '@tonic-ui/react';
import {
  useConst,
} from '@tonic-ui/react-hooks';
import { FormProvider, useForm } from 'react-hook-form';
import React, { useCallback, useRef } from 'react';
import useToast from '@app/hooks/useToast';
import i18n from '@app/lib/i18n';
import FieldInput from '@app/pages/Administration/components/FieldInput';
import FieldTextarea from '@app/pages/Administration/components/FieldTextarea';
import {
  useCreateMacroMutation,
} from '@app/queries/macros';
import {
  MACRO_VARIABLE_EXAMPLES,
} from '../constants';
import {
  insertAtCaret,
} from '../utils';

const CreateMacroDrawer = ({
  onClose,
  ...rest
}) => {
  const gcodeInputRef = useRef();
  const notifyToast = useToast();
  const createMacroMutation = useCreateMacroMutation({
    onSuccess: () => {
      if (typeof onClose === 'function') {
        onClose();
      }
    },
    onError: () => {
      notifyToast({
        appearance: 'error',
        content: (
          <Text>{i18n._('An unexpected error has occurred.')}</Text>
        ),
        duration: undefined,
      });
    },
  });
  const defaultValues = useConst(() => ({
    name: '',
    action: '',
  }));
  const methods = useForm({
    defaultValues,
    mode: 'onSubmit',
  });
  const { isSubmitted } = methods.formState;
  const handleFormSubmit = useCallback((values) => {
    createMacroMutation.mutate({
      data: values,
    });
  }, [createMacroMutation]);
  const isFormDisabled = createMacroMutation.isLoading;

  return (
    <Drawer
      backdrop
      closeOnEsc
      isClosable
      isOpen={true}
      onClose={onClose}
      size="md"
      {...rest}
    >
      <DrawerOverlay />
      <FormProvider {...methods}>
        <DrawerContent
          as="form"
          noValidate
          onSubmit={methods.handleSubmit(handleFormSubmit)}
        >
          <DrawerHeader>
            <Text>
              {i18n._('New Macro')}
            </Text>
          </DrawerHeader>
          <DrawerBody>
            <FieldInput
              name="name"
              label={i18n._('Macro name:')}
              required
            />
            <FieldTextarea
              ref={gcodeInputRef}
              name="action"
              label={i18n._('G-code commands:')}
              required
              infoTipLabel={i18n._('Input the G-code commands to execute with this macro.')}
              rows="10"
              labelAction={(
                <Dropdown
                  items={MACRO_VARIABLE_EXAMPLES.flatMap(group => [
                    {
                      value: group.title,
                      type: 'custom',
                      content: (
                        <MenuGroup
                          key={group.title}
                          title={group.title}
                        />
                      ),
                    },
                    ...group.data.map(item => (
                      {
                        value: item,
                        content: item,
                        props: {
                          value: item,
                          onKeyDown: (event) => {
                            if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) {
                              event.preventDefault();
                              event.currentTarget.click();
                            }
                          },
                          onClick: (event) => {
                            const el = gcodeInputRef.current;
                            const value = event.currentTarget.value;
                            const textareaValue = insertAtCaret(el, value);
                            methods.setValue('action', textareaValue, {
                              shouldDirty: true,
                              shouldValidate: isSubmitted,
                            });
                          },
                        },
                      }
                    )),
                  ])}
                  renderItem={item => item?.content}
                  renderToggle={() => (
                    <DropdownToggle>
                      {({ getToggleProps }) => (
                        <LinkButton {...getToggleProps()}>
                          {i18n._('Select variables')}
                        </LinkButton>
                      )}
                    </DropdownToggle>
                  )}
                />
              )}
            />
          </DrawerBody>
          <DrawerFooter>
            <Flex
              alignItems="center"
              columnGap="2x"
            >
              <Button
                type="button"
                onClick={onClose}
                sx={{
                  minWidth: 80,
                }}
              >
                {i18n._('Cancel')}
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isFormDisabled}
                sx={{
                  minWidth: 80,
                }}
              >
                {i18n._('Add')}
              </Button>
            </Flex>
          </DrawerFooter>
        </DrawerContent>
      </FormProvider>
    </Drawer>
  );
};

export default CreateMacroDrawer;
