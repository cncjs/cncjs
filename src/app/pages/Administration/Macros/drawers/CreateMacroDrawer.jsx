import { useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  DrawerOverlay,
  Flex,
  Text,
} from '@tonic-ui/react';
import {
  useConst,
} from '@tonic-ui/react-hooks';
import React, { useCallback } from 'react';
import { Form, FormSpy } from 'react-final-form';
import FormGroup from '@app/components/FormGroup';
import {
  InlineToastContainer,
  InlineToasts,
  useInlineToasts,
} from '@app/components/InlineToasts';
import i18n from '@app/lib/i18n';
import FieldInput from '@app/pages/Administration/components/FieldInput';
import FieldTextarea from '@app/pages/Administration/components/FieldTextarea';
import FieldTextLabel from '@app/pages/Administration/components/FieldTextLabel';
import {
  API_COMMANDS_QUERY_KEY,
  useCreateMacroMutation,
} from '../queries';

const required = value => (value ? undefined : i18n._('This field is required.'));

const CreateMacroDrawer = ({
  onClose,
  ...rest
}) => {
  const { toasts, notify: notifyToast } = useInlineToasts();
  const queryClient = useQueryClient();
  const createMacroMutation = useCreateMacroMutation({
    onSuccess: () => {
      if (typeof onClose === 'function') {
        onClose();
      }

      // Invalidate `useFetchMacrosQuery`
      queryClient.invalidateQueries({ queryKey: API_COMMANDS_QUERY_KEY });
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
  const initialValues = useConst(() => ({
    name: '',
    data: '',
  }));
  const handleFormSubmit = useCallback((values) => {
    createMacroMutation.mutate({
      data: values,
    });
  }, [createMacroMutation]);

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
      <Form
        initialValues={initialValues}
        onSubmit={handleFormSubmit}
        subscription={{}}
        render={({ form }) => (
          <DrawerContent>
            <InlineToastContainer>
              <InlineToasts toasts={toasts} />
            </InlineToastContainer>
            <DrawerHeader>
              <Text>
                {i18n._('New Macro')}
              </Text>
            </DrawerHeader>
            <DrawerBody>
              <FormGroup>
                <Box mb="1x">
                  <FieldTextLabel
                    required
                  >
                    {i18n._('Macro name:')}
                  </FieldTextLabel>
                </Box>
                <FieldInput
                  name="name"
                  validate={required}
                />
              </FormGroup>
              <FormGroup>
                <Box mb="1x">
                  <FieldTextLabel
                    required
                    infoTipLabel={i18n._('Input the G-code commands to execute with this macro.')}
                  >
                    {i18n._('G-code commands:')}
                  </FieldTextLabel>
                </Box>
                <FieldTextarea
                  name="data"
                  rows="10"
                  validate={required}
                />
              </FormGroup>
            </DrawerBody>
            <DrawerFooter>
              <FormSpy
                subscription={{
                  invalid: true,
                }}
              >
                {({ invalid }) => {
                  const canSubmit = (() => {
                    if (createMacroMutation.isLoading) {
                      return false;
                    }
                    if (invalid) {
                      return false;
                    }
                    return true;
                  })();
                  const canClickAdd = canSubmit;
                  const handleClickAdd = () => {
                    form.submit();
                  };

                  return (
                    <Flex
                      alignItems="center"
                      columnGap="2x"
                    >
                      <Button
                        onClick={onClose}
                        sx={{
                          minWidth: 80,
                        }}
                      >
                        {i18n._('Cancel')}
                      </Button>
                      <Button
                        variant="primary"
                        disabled={!canClickAdd}
                        onClick={handleClickAdd}
                        sx={{
                          minWidth: 80,
                        }}
                      >
                        {i18n._('Add')}
                      </Button>
                    </Flex>
                  );
                }}
              </FormSpy>
            </DrawerFooter>
          </DrawerContent>
        )}
      />
    </Drawer>
  );
};

export default CreateMacroDrawer;
