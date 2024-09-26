import {
  Box,
  Button,
  Divider,
  Flex,
  Icon,
  Spinner,
  Text,
  useColorMode,
  useColorStyle,
} from '@tonic-ui/react';
import { WarningCircleIcon } from '@tonic-ui/react-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { Form, FormSpy } from 'react-final-form';
import useToast from '@app/hooks/useToast';
import i18n from '@app/lib/i18n';
import FieldCheckbox from '@app/pages/Administration/components/FieldCheckbox';
import Overlay from '@app/pages/Administration/components/Overlay';
import TitleText from '@app/pages/Administration/components/TitleText';
import {
  useGeneralSettingsQuery,
  useGeneralSettingsMutation,
} from './queries';

const GeneralSettings = () => {
  const [formState, setFormState] = useState({});
  const [colorMode] = useColorMode();
  const [colorStyle] = useColorStyle({ colorMode });
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

  useEffect(() => {
    setFormState(query.data);
  }, [query.data]);

  const isFormDisabled = query.isFetching || query.error;

  return (
    <Form
      initialValues={formState}
      onSubmit={handleFormSubmit}
      subscription={{}}
      render={({ form }) => (
        <Flex
          flexDirection="column"
          height="100%"
          position="relative"
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
            p="4x"
            overflowY="auto"
          >
            <>
              <TitleText>
                {i18n._('Update')}
              </TitleText>
              <FieldCheckbox
                name="checkForUpdates"
                disabled={isFormDisabled}
              >
                {i18n._('Automatically check for updates')}
              </FieldCheckbox>
            </>
            <Divider my="4x" />
            <>
              <TitleText>
                {i18n._('Controller')}
              </TitleText>
              <Text mb="3x">
                {i18n._('Exception Handling')}
              </Text>
              <Box mb="1x">
                <FieldCheckbox
                  name="controller.exception.ignoreErrors"
                  disabled={isFormDisabled}
                >
                  {i18n._('Continue execution when an error is detected in the G-code program')}
                </FieldCheckbox>
              </Box>
              <Flex alignItems="center" columnGap="2x" ml="6x">
                <Icon as={WarningCircleIcon} color={colorStyle.color.error} />
                <Text>{i18n._('Enabling this option may cause machine damage if you don\'t have an Emergency Stop button to prevent a dangerous situation.')}</Text>
              </Flex>
            </>
          </Box>
          <Box
            flex="none"
          >
            <FormSpy
              subscription={{
                invalid: true,
              }}
            >
              {({ invalid }) => {
                const canSave = (() => {
                  if (isFormDisabled) {
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
                    backgroundColor={colorStyle.background.secondary}
                    px="4x"
                    py="3x"
                    alignItems="center"
                    justifyContent="flex-start"
                  >
                    <Button
                      justifySelf="flex-end"
                      variant="primary"
                      disabled={!canSave}
                      onClick={handleClickSave}
                    >
                      {i18n._('Save')}
                    </Button>
                  </Flex>
                );
              }}
            </FormSpy>
          </Box>
        </Flex>
      )}
    />
  );
};

export default GeneralSettings;
