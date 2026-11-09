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
  FormControl,
  Spinner,
  Switch,
  Text,
  TextLabel,
} from '@tonic-ui/react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import React, { useCallback, useEffect } from 'react';
import useToast from '@app/hooks/useToast';
import i18n from '@app/lib/i18n';
import FieldInput from '@app/pages/Administration/components/FieldInput';
import FieldTextLabel from '@app/pages/Administration/components/FieldTextLabel';
import {
  API_USERS_QUERY_KEY,
  useReadUserQuery,
  useUpdateUserMutation,
} from '../queries';

/** @param {{ onClose?: Function, id?: string }} props */
const UpdateUserDrawer = ({
  id,
  onClose,
  ...rest
}) => {
  const notifyToast = useToast();
  const queryClient = useQueryClient();
  const readUserQuery = useReadUserQuery({
    meta: {
      id,
    },
  });
  const updateUserMutation = useUpdateUserMutation({
    onSuccess: () => {
      if (typeof onClose === 'function') {
        onClose();
      }

      // Invalidate `useFetchUsersQuery`
      queryClient.invalidateQueries({ queryKey: API_USERS_QUERY_KEY });
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
  const methods = useForm({
    defaultValues: {
      enabled: false,
      name: '',
    },
    mode: 'onSubmit',
  });
  const {
    reset,
    handleSubmit,
  } = methods;

  // Populate the form once the record loads. `reset` does not run validation,
  // so no invalid state flashes when the edit form opens.
  useEffect(() => {
    if (readUserQuery.data) {
      reset({
        enabled: readUserQuery.data.enabled,
        name: readUserQuery.data.name,
      });
    }
  }, [readUserQuery.data, reset]);

  const handleFormSubmit = useCallback((values) => {
    updateUserMutation.mutate({
      meta: {
        id,
      },
      data: values,
    });
  }, [updateUserMutation, id]);
  const isFormDisabled = (readUserQuery.isError || readUserQuery.isFetching || updateUserMutation.isLoading);

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
          onSubmit={handleSubmit(handleFormSubmit)}
        >
          <DrawerHeader>
            <Text>
              {i18n._('User Details')}
            </Text>
          </DrawerHeader>
          <DrawerBody>
            {readUserQuery.isFetching && (
              <Spinner />
            )}
            {!(readUserQuery.isFetching) && (
              <>
                <FormControl mb="4x">
                  <Flex
                    alignItems="center"
                    columnGap="3x"
                  >
                    <FieldTextLabel>
                      {i18n._('Status:')}
                    </FieldTextLabel>
                    <Controller
                      name="enabled"
                      render={({ field }) => (
                        <Flex
                          alignItems="center"
                          columnGap="2x"
                        >
                          <Switch
                            aria-label="Enable account"
                            checked={!!field.value}
                            onChange={(e) => field.onChange(e.target.checked)}
                          />
                          <TextLabel>
                            {field.value === true ? i18n._('ON') : i18n._('OFF')}
                          </TextLabel>
                        </Flex>
                      )}
                    />
                  </Flex>
                </FormControl>
                <FieldInput
                  name="name"
                  label={i18n._('User name:')}
                  required
                  autoComplete="username"
                />
              </>
            )}
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
                {i18n._('Save')}
              </Button>
            </Flex>
          </DrawerFooter>
        </DrawerContent>
      </FormProvider>
    </Drawer>
  );
};

export default UpdateUserDrawer;
