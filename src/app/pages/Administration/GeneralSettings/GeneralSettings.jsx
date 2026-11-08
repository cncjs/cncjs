import {
  Box,
  Button,
  Checkbox,
  Divider,
  Flex,
  Icon,
  Spinner,
  Text,
} from '@tonic-ui/react';
import { WarningCircleIcon } from '@tonic-ui/react-icons';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import React, { useCallback, useEffect } from 'react';
import useToast from '@app/hooks/useToast';
import i18n from '@app/lib/i18n';
import Overlay from '@app/pages/Administration/components/Overlay';
import TitleText from '@app/pages/Administration/components/TitleText';
import {
  useGeneralSettingsQuery,
  useGeneralSettingsMutation,
} from './queries';

const GeneralSettings = () => {
  const toast = useToast();
  const query = useGeneralSettingsQuery({
    onError: () => {
      toast({
        appearance: 'error',
        content: (
          <Text>{i18n._('An unexpected error has occurred.')}</Text>
        ),
        duration: null,
      });
    },
  });
  const mutation = useGeneralSettingsMutation();
  const methods = useForm({
    defaultValues: {},
    mode: 'onSubmit',
  });
  const {
    reset,
    handleSubmit,
  } = methods;

  const handleFormSubmit = useCallback((values) => {
    mutation.mutate({ data: values }, {
      onSuccess: () => {
        toast({
          appearance: 'success',
          content: (
            <Text>{i18n._('Settings saved.')}</Text>
          ),
        });
      },
      onError: () => {
        toast({
          appearance: 'error',
          content: (
            <Text>{i18n._('An unexpected error has occurred.')}</Text>
          ),
          duration: null,
        });
      },
    });
  }, [mutation, toast]);

  // Populate the form once the settings load. `reset` does not run validation.
  useEffect(() => {
    if (query.isSuccess) {
      reset(query.data);
    }
  }, [query.isSuccess, query.data, reset]);

  const isFormDisabled = query.isFetching || query.error;

  return (
    <Flex
      sx={{
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <FormProvider {...methods}>
        <Flex
          as="form"
          flex="auto"
          flexDirection="column"
          minHeight={0}
          noValidate
          onSubmit={handleSubmit(handleFormSubmit)}
        >
          {query.isFetching && (
            <Overlay
              alignItems="center"
              justifyContent="center"
            >
              <Spinner size="md" />
            </Overlay>
          )}
          <Box
            flex="auto"
            overflowY="auto"
            px="6x"
            py="4x"
          >
            <Box>
              <TitleText>
                {i18n._('Controller')}
              </TitleText>
              <Text mb="3x">
                {i18n._('Exception Handling')}
              </Text>
              <Box mb="1x">
                <Controller
                  name="controller.exception.ignoreErrors"
                  render={({ field }) => (
                    <Flex columnGap="2x">
                      <Checkbox
                        disabled={isFormDisabled}
                        checked={!!field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                      >
                        <Text>
                          {i18n._('Continue execution when an error is detected in the G-code program')}
                        </Text>
                      </Checkbox>
                    </Flex>
                  )}
                />
              </Box>
              <Flex alignItems="center" columnGap="2x" ml="6x">
                <Icon as={WarningCircleIcon} color="error.icon" />
                <Text>{i18n._('Enabling this option may cause machine damage if you don\'t have an Emergency Stop button to prevent a dangerous situation.')}</Text>
              </Flex>
            </Box>
            <Divider my="4x" />
            <Box>
              <TitleText>
                {i18n._('Data Collection')}
              </TitleText>
              <Controller
                name="allowAnonymousUsageDataCollection"
                render={({ field }) => (
                  <Flex columnGap="2x">
                    <Checkbox
                      disabled={isFormDisabled}
                      checked={!!field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                    >
                      <Text>
                        {i18n._('Allow anonymous usage data collection')}
                      </Text>
                    </Checkbox>
                  </Flex>
                )}
              />
            </Box>
          </Box>
          <Flex
            flex="none"
            backgroundColor="background.high"
            alignItems="center"
            justifyContent="flex-start"
            px="6x"
            py="4x"
          >
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
        </Flex>
      </FormProvider>
    </Flex>
  );
};

export default GeneralSettings;
