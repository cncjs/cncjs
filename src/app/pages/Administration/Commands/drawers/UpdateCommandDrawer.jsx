import { useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  DrawerOverlay,
  Flex,
  Spinner,
  Switch,
  Text,
  TextLabel,
} from '@tonic-ui/react';
import memoize from 'micro-memoize';
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
import {
  API_COMMANDS_QUERY_KEY,
  useReadCommandQuery,
  useUpdateCommandMutation,
} from '../queries';

const required = value => (value ? undefined : i18n._('This field is required.'));

const getMemoizedState = memoize(state => ({ ...state }));

const UpdateCommandDrawer = ({
  id,
  onClose,
  ...rest
}) => {
  const { toasts, notify: notifyToast } = useInlineToasts();
  const queryClient = useQueryClient();
  const { data, isError, isFetching } = useReadCommandQuery({
    meta: {
      id,
    },
  });
  const updateCommandMutation = useUpdateCommandMutation({
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

  const initialValues = getMemoizedState({
    enabled: data?.enabled,
    title: data?.title,
    commands: data?.commands,
  });

  const handleFormSubmit = useCallback((values) => {
    updateCommandMutation.mutate({
      meta: {
        id,
      },
      data: values,
    });
  }, [updateCommandMutation, id]);

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
                {i18n._('Command Details')}
              </Text>
            </DrawerHeader>
            <DrawerBody>
              {isFetching && (
                <Spinner />
              )}
              {!isFetching && (
                <>
                  <FormGroup>
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
                  </FormGroup>
                  <FormGroup>
                    <TextLabel mb="2x">
                      {i18n._('Name:')}
                    </TextLabel>
                    <FieldInput
                      name="title"
                      validate={required}
                    />
                  </FormGroup>
                  <FormGroup>
                    <TextLabel mb="2x">
                      {i18n._('Commands:')}
                    </TextLabel>
                    <FieldTextarea
                      name="commands"
                      rows="10"
                      validate={required}
                    />
                  </FormGroup>
                </>
              )}
            </DrawerBody>
            <DrawerFooter>
              <FormSpy
                subscription={{
                  invalid: true,
                }}
              >
                {({ invalid }) => {
                  const canSubmit = (() => {
                    if (isError) {
                      return false;
                    }
                    if (isFetching) {
                      return false;
                    }
                    if (invalid) {
                      return false;
                    }
                    return true;
                  })();
                  const handleClickSave = () => {
                    form.submit();
                  };

                  return (
                    <Flex
                      alignItems="center"
                      columnGap="2x"
                    >
                      <Button
                        variant="primary"
                        disabled={!canSubmit}
                        onClick={handleClickSave}
                        sx={{
                          minWidth: 80,
                        }}
                      >
                        {i18n._('Save')}
                      </Button>
                      <Button
                        onClick={onClose}
                        sx={{
                          minWidth: 80,
                        }}
                      >
                        {i18n._('Cancel')}
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

export default UpdateCommandDrawer;
