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
  Switch,
  Text,
  TextLabel,
} from '@tonic-ui/react';
import {
  useConst,
} from '@tonic-ui/react-hooks';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import React, { useCallback } from 'react';
import useToast from '@app/hooks/useToast';
import i18n from '@app/lib/i18n';
import FieldInput from '@app/pages/Administration/components/FieldInput';
import FieldTextarea from '@app/pages/Administration/components/FieldTextarea';
import FieldTextLabel from '@app/pages/Administration/components/FieldTextLabel';
import {
  API_EVENTS_QUERY_KEY,
  useCreateEventMutation,
} from '../queries';

const CreateEventDrawer = ({
  onClose,
  ...rest
}) => {
  const notifyToast = useToast();
  const queryClient = useQueryClient();
  const createEventMutation = useCreateEventMutation({
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
  const defaultValues = useConst(() => ({
    enabled: true,
    name: '',
    trigger: '',
    action: '',
  }));
  const methods = useForm({
    defaultValues,
    mode: 'onSubmit',
  });
  const handleFormSubmit = useCallback((values) => {
    createEventMutation.mutate({
      data: values,
    });
  }, [createEventMutation]);
  const isFormDisabled = createEventMutation.isLoading;

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
              {i18n._('New Event')}
            </Text>
          </DrawerHeader>
          <DrawerBody>
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
                        aria-label="Enable event"
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
              label={i18n._('Event name:')}
              required
            />
            <FieldInput
              name="trigger"
              label={i18n._('Event trigger:')}
              required
            />
            <FieldTextarea
              name="action"
              label={i18n._('Event action:')}
              required
              rows="10"
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

export default CreateEventDrawer;
