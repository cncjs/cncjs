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
  useReadMacroQuery,
  useUpdateMacroMutation,
} from '../queries';

const required = value => (value ? undefined : i18n._('This field is required.'));

const getMemoizedState = memoize(state => ({ ...state }));

const UpdateMacroDrawer = ({
  id,
  onClose,
  ...rest
}) => {
  const { toasts, notify: notifyToast } = useInlineToasts();
  const queryClient = useQueryClient();
  const readMacroQuery = useReadMacroQuery({
    meta: {
      id,
    },
  });
  const updateMacroMutation = useUpdateMacroMutation({
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

  const initialValues = getMemoizedState({
    name: readMacroQuery.data?.name,
    content: readMacroQuery.data?.content,
  });

  const handleFormSubmit = useCallback((values) => {
    updateMacroMutation.mutate({
      meta: {
        id,
      },
      data: values,
    });
  }, [updateMacroMutation, id]);

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
                {i18n._('Macro Details')}
              </Text>
            </DrawerHeader>
            <DrawerBody>
              {readMacroQuery.isFetching && (
                <Spinner />
              )}
              {!(readMacroQuery.isFetching) && (
                <>
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
                      name="content"
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
                    if (readMacroQuery.isError) {
                      return false;
                    }
                    if (readMacroQuery.isFetching) {
                      return false;
                    }
                    if (updateMacroMutation.isLoading) {
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
                        onClick={onClose}
                        sx={{
                          minWidth: 80,
                        }}
                      >
                        {i18n._('Cancel')}
                      </Button>
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

export default UpdateMacroDrawer;
