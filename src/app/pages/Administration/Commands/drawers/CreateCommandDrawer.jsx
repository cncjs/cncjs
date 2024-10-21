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
  Switch,
  Text,
  TextLabel,
} from '@tonic-ui/react';
import {
  useConst,
} from '@tonic-ui/react-hooks';
import React, { useCallback } from 'react';
import { Field, Form, FormSpy } from 'react-final-form';
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
  useCreateCommandMutation,
} from '../queries';

const required = value => (value ? undefined : i18n._('This field is required.'));

const CreateCommandDrawer = ({
  onClose,
  ...rest
}) => {
  const { toasts, notify: notifyToast } = useInlineToasts();
  const queryClient = useQueryClient();
  const createCommandMutation = useCreateCommandMutation({
    onSuccess: () => {
      if (typeof onClose === 'function') {
        onClose();
      }

      // Invalidate `useFetchCommandsQuery`
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
    title: '',
    commands: '',
    enabled: true,
  }));
  const handleFormSubmit = useCallback((values) => {
    createCommandMutation.mutate({
      data: values,
    });
  }, [createCommandMutation]);

  return (
    <Drawer
      backdrop
      closeOnEsc
      closeOnOutsideClick
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
                {i18n._('New Command')}
              </Text>
            </DrawerHeader>
            <DrawerBody>
              <FormGroup>
                <Flex
                  alignItems="center"
                  justifyContent="space-between"
                  columnGap="3x"
                >
                  <FieldTextLabel>
                    {i18n._('Enabled:')}
                  </FieldTextLabel>
                  <Field name="enabled">
                    {({ input, meta }) => {
                      return (
                        <Flex
                          alignItems="center"
                          columnGap="2x"
                        >
                          <Switch
                            {...input}
                            checked={input.value}
                          />
                          <TextLabel>
                            {input.value === true ? i18n._('ON') : i18n._('OFF')}
                          </TextLabel>
                        </Flex>
                      );
                    }}
                  </Field>
                </Flex>
              </FormGroup>
              <FormGroup>
                <Box mb="1x">
                  <FieldTextLabel
                    required
                  >
                    {i18n._('Command name:')}
                  </FieldTextLabel>
                </Box>
                <FieldInput
                  name="title"
                  placeholder={i18n._('e.g., Activate Air Purifier')}
                  validate={required}
                />
              </FormGroup>
              <FormGroup>
                <Box mb="1x">
                  <FieldTextLabel
                    required
                    infoTipLabel={i18n._('Enter the shell commands to be executed when this command runs. Each line will be executed sequentially.')}
                  >
                    {i18n._('Shell commands:')}
                  </FieldTextLabel>
                </Box>
                <FieldTextarea
                  name="commands"
                  rows="10"
                  placeholder="/home/cncjs/bin/activate-air-purifier"
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
                        {i18n._('Create Command')}
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

export default CreateCommandDrawer;
