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
  Spinner,
  Switch,
  Text,
  TextLabel,
} from '@tonic-ui/react';
import memoize from 'micro-memoize';
import React, { useCallback } from 'react';
import { Field, Form } from 'react-final-form';
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
import * as validations from '@app/pages/Administration/validations';
import {
  API_EVENTS_QUERY_KEY,
  useReadEventQuery,
  useUpdateEventMutation,
} from '../queries';

const getMemoizedState = memoize(state => ({ ...state }));

const UpdateEventDrawer = ({
  id,
  onClose,
  ...rest
}) => {
  const { toasts, notify: notifyToast } = useInlineToasts();
  const queryClient = useQueryClient();
  const readEventQuery = useReadEventQuery({
    meta: {
      id,
    },
  });
  const updateEventMutation = useUpdateEventMutation({
    onSuccess: () => {
      if (typeof onClose === 'function') {
        onClose();
      }

      // Invalidate `useFetchEventsQuery`
      queryClient.invalidateQueries({ queryKey: API_EVENTS_QUERY_KEY });
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
    enabled: readEventQuery.data?.enabled,
    event: readEventQuery.data?.event,
    trigger: readEventQuery.data?.trigger,
    commands: readEventQuery.data?.commands,
  });
  const handleFormSubmit = useCallback((values) => {
    updateEventMutation.mutate({
      meta: {
        id,
      },
      data: values,
    });
  }, [updateEventMutation, id]);
  const isFormDisabled = (readEventQuery.isError || readEventQuery.isFetching || updateEventMutation.isLoading);

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
        validate={(values) => {
          const errors = {};
          errors.event = validations.required(values.event);
          errors.trigger = validations.required(values.trigger);
          errors.commands = validations.required(values.commands);
          return errors;
        }}
        render={({ form }) => (
          <DrawerContent>
            <InlineToastContainer>
              <InlineToasts toasts={toasts} />
            </InlineToastContainer>
            <DrawerHeader>
              <Text>
                {i18n._('Event Details')}
              </Text>
            </DrawerHeader>
            <DrawerBody>
              {readEventQuery.isFetching && (
                <Spinner />
              )}
              {!(readEventQuery.isFetching) && (
                <>
                  <FormGroup>
                    <Flex
                      alignItems="center"
                      columnGap="3x"
                    >
                      <FieldTextLabel>
                        {i18n._('Status:')}
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
                        {i18n._('Event name:')}
                      </FieldTextLabel>
                    </Box>
                    <FieldInput
                      name="event"
                    />
                  </FormGroup>
                  <FormGroup>
                    <Box mb="1x">
                      <FieldTextLabel
                        required
                      >
                        {i18n._('Event trigger:')}
                      </FieldTextLabel>
                    </Box>
                    <FieldInput
                      name="trigger"
                    />
                  </FormGroup>
                  <FormGroup>
                    <Box mb="1x">
                      <FieldTextLabel
                        required
                      >
                        {i18n._('Event action:')}
                      </FieldTextLabel>
                    </Box>
                    <FieldTextarea
                      name="commands"
                      rows="10"
                    />
                  </FormGroup>
                </>
              )}
            </DrawerBody>
            <DrawerFooter>
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
                  disabled={isFormDisabled}
                  onClick={() => {
                    form.submit();
                  }}
                  sx={{
                    minWidth: 80,
                  }}
                >
                  {i18n._('Save')}
                </Button>
              </Flex>
            </DrawerFooter>
          </DrawerContent>
        )}
      />
    </Drawer>
  );
};

export default UpdateEventDrawer;
