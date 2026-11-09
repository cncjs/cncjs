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
  Text,
} from '@tonic-ui/react';
import {
  useConst,
} from '@tonic-ui/react-hooks';
import { FormProvider, useForm } from 'react-hook-form';
import React, { useCallback } from 'react';
import useToast from '@app/hooks/useToast';
import i18n from '@app/lib/i18n';
import FieldInput from '@app/pages/Administration/components/FieldInput';
import {
  DEFAULT_MACHINE_PROFILE_LIMITS,
  MACHINE_PROFILE_LIMIT_FIELDS,
  getMachineProfileLimitLabel,
  normalizeMachineProfileLimits,
  validateMachineProfileLimits,
} from '../limits';
import {
  API_MACHINES_QUERY_KEY,
  useCreateMachineMutation,
} from '../queries';

/**
 * @param {{ onClose?: Function }} props
 * @returns {JSX.Element}
 */
const CreateMachineDrawer = ({
  onClose,
  ...rest
}) => {
  const notifyToast = useToast();
  const queryClient = useQueryClient();
  const createMachineMutation = useCreateMachineMutation({
    onSuccess: () => {
      if (typeof onClose === 'function') {
        onClose();
      }

      // Invalidate `useFetchMachinesQuery`
      queryClient.invalidateQueries({ queryKey: API_MACHINES_QUERY_KEY });
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
    limits: { ...DEFAULT_MACHINE_PROFILE_LIMITS },
  }));
  const methods = useForm({
    defaultValues,
    mode: 'onSubmit',
  });
  const handleFormSubmit = useCallback((values) => {
    createMachineMutation.mutate({
      data: {
        name: values.name,
        limits: normalizeMachineProfileLimits(values.limits),
      },
    });
  }, [createMachineMutation]);
  const isFormDisabled = createMachineMutation.isLoading;

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
              {i18n._('New Machine')}
            </Text>
          </DrawerHeader>
          <DrawerBody>
            <FieldInput
              name="name"
              label={i18n._('Machine name:')}
              required
            />
            <Text fontWeight="bold" mb="2x">{i18n._('Limits')}</Text>
            {MACHINE_PROFILE_LIMIT_FIELDS.map(({ key, axis, bound }) => (
              <FieldInput
                key={key}
                name={`limits.${key}`}
                deps={bound === 'min' ? `limits.${axis.toLowerCase()}max` : undefined}
                label={getMachineProfileLimitLabel(axis, bound)}
                required
                type="number"
                step="any"
                validate={(_value, formValues) => validateMachineProfileLimits(formValues).limits?.[key]}
              />
            ))}
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

export default CreateMachineDrawer;
