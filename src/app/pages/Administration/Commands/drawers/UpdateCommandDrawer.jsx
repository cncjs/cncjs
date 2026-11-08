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
import FieldTextarea from '@app/pages/Administration/components/FieldTextarea';
import FieldTextLabel from '@app/pages/Administration/components/FieldTextLabel';
import {
  API_COMMANDS_QUERY_KEY,
  useReadCommandQuery,
  useUpdateCommandMutation,
} from '../queries';

const UpdateCommandDrawer = ({
  id,
  onClose,
  ...rest
}) => {
  const notifyToast = useToast();
  const queryClient = useQueryClient();
  const readCommandQuery = useReadCommandQuery({
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
  const methods = useForm({
    defaultValues: {
      enabled: false,
      name: '',
      action: '',
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
    if (readCommandQuery.data) {
      reset({
        enabled: readCommandQuery.data.enabled,
        name: readCommandQuery.data.name,
        action: readCommandQuery.data.action,
      });
    }
  }, [readCommandQuery.data, reset]);

  const handleFormSubmit = useCallback((values) => {
    updateCommandMutation.mutate({
      meta: {
        id,
      },
      data: values,
    });
  }, [updateCommandMutation, id]);
  const isFormDisabled = (readCommandQuery.isError || readCommandQuery.isFetching || updateCommandMutation.isLoading);

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
              {i18n._('Command Details')}
            </Text>
          </DrawerHeader>
          <DrawerBody>
            {readCommandQuery.isFetching && (
              <Spinner />
            )}
            {!(readCommandQuery.isFetching) && (
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
                            aria-label="Enable command"
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
                  label={i18n._('Command name:')}
                  required
                  placeholder={i18n._('e.g., Activate Air Purifier')}
                />
                <FieldTextarea
                  name="action"
                  label={i18n._('Command action:')}
                  required
                  infoTipLabel={i18n._('Input the shell commands to execute with this command.')}
                  rows="10"
                  placeholder="/home/cncjs/bin/activate-air-purifier"
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

export default UpdateCommandDrawer;
