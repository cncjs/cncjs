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
  Text,
} from '@tonic-ui/react';
import { FormProvider, useForm } from 'react-hook-form';
import React, { useCallback, useEffect } from 'react';
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
  useReadMachineQuery,
  useUpdateMachineMutation,
} from '../queries';

/** @param {{ id: string, onClose?: Function }} props */
const UpdateMachineDrawer = ({
  id,
  onClose,
  ...rest
}) => {
  const notifyToast = useToast();
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

  const methods = useForm({
    defaultValues: {
      name: '',
      limits: { ...DEFAULT_MACHINE_PROFILE_LIMITS },
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
    if (readMachineQuery.data) {
      reset({
        name: readMachineQuery.data.name,
        limits: {
          ...DEFAULT_MACHINE_PROFILE_LIMITS,
          ...readMachineQuery.data.limits,
        },
      });
    }
  }, [readMachineQuery.data, reset]);

  const handleFormSubmit = useCallback((values) => {
    updateMachineMutation.mutate({
      meta: {
        id,
      },
      data: {
        name: values.name,
        limits: normalizeMachineProfileLimits(values.limits),
      },
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
      <FormProvider {...methods}>
        <DrawerContent
          as="form"
          noValidate
          onSubmit={handleSubmit(handleFormSubmit)}
        >
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
                <FieldInput
                  name="name"
                  label={i18n._('Machine name:')}
                  required
                  placeholder={i18n._('e.g., CNC Router')}
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

export default UpdateMachineDrawer;
