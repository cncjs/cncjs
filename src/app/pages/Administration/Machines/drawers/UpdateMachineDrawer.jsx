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
  API_COMMANDS_QUERY_KEY,
  useReadMachineQuery,
  useUpdateMachineMutation,
} from '../queries';

const getMemoizedState = memoize(state => ({ ...state }));

const UpdateMachineDrawer = ({
  id,
  onClose,
  ...rest
}) => {
  const { toasts, notify: notifyToast } = useInlineToasts();
  const queryClient = useQueryClient();
  const readMachineQuery = useReadMachineQuery({
    meta: {
      id,
    },
  });
  const updateMachineMutation = useUpdateMachineMutation({
    onSuccess: () => {
      if (typeof onClose === 'function') {
        onClose();
      }

      // Invalidate `useFetchMachinesQuery`
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
    enabled: readMachineQuery.data?.enabled,
    title: readMachineQuery.data?.title,
    commands: readMachineQuery.data?.commands,
  });

  const handleFormSubmit = useCallback((values) => {
    updateMachineMutation.mutate({
      meta: {
        id,
      },
      data: values,
    });
  }, [updateMachineMutation, id]);
  const isFormDisabled = (readMachineQuery.isError || readMachineQuery.isFetching || updateMachineMutation.isLoading);

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
          errors.name = validations.required(values.name);
          errors.data = validations.required(values.data);
          return errors;
        }}
        render={({ form }) => (
          <DrawerContent>
            <InlineToastContainer>
              <InlineToasts toasts={toasts} />
            </InlineToastContainer>
            <DrawerHeader>
              <Text>
                {i18n._('Machine Details')}
              </Text>
            </DrawerHeader>
            <DrawerBody>
              {readMachineQuery.isFetching && (
                <Spinner />
              )}
              {!(readMachineQuery.isFetching) && (
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
                        {i18n._('Machine name:')}
                      </FieldTextLabel>
                    </Box>
                    <FieldInput
                      name="title"
                      placeholder={i18n._('e.g., Activate Air Purifier')}
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

export default UpdateMachineDrawer;
