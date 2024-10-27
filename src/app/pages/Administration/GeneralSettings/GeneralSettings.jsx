import {
  Box,
  Button,
  Checkbox,
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
import { Field, Form } from 'react-final-form';
import useToast from '@app/hooks/useToast';
import i18n from '@app/lib/i18n';
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
    if (query.isSuccess) {
      setFormState(query.data);
    }
  }, [query.isSuccess, query.data]);

  const isFormDisabled = query.isFetching || query.error;

  return (
    <Flex
      sx={{
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <Form
        initialValues={formState}
        onSubmit={handleFormSubmit}
        validate={(values) => {
          const errors = {};
          return errors;
        }}
        render={({ form }) => (
          <>
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
                  <Field
                    type="checkbox"
                    name="controller.exception.ignoreErrors"
                  >
                    {({ input }) => (
                      <Flex columnGap="2x">
                        <Checkbox
                          disabled={isFormDisabled}
                          {...input}
                        >
                          <Text>
                            {i18n._('Continue execution when an error is detected in the G-code program')}
                          </Text>
                        </Checkbox>
                      </Flex>
                    )}
                  </Field>
                </Box>
                <Flex alignItems="center" columnGap="2x" ml="6x">
                  <Icon as={WarningCircleIcon} color={colorStyle.color.error} />
                  <Text>{i18n._('Enabling this option may cause machine damage if you don\'t have an Emergency Stop button to prevent a dangerous situation.')}</Text>
                </Flex>
              </Box>
              <Divider my="4x" />
              <Box>
                <TitleText>
                  {i18n._('Data Collection')}
                </TitleText>
                <Field
                  type="checkbox"
                  name="allowAnonymousUsageDataCollection"
                >
                  {({ input }) => (
                    <Flex columnGap="2x">
                      <Checkbox
                        disabled={isFormDisabled}
                        {...input}
                      >
                        <Text>
                          {i18n._('Allow anonymous usage data collection')}
                        </Text>
                      </Checkbox>
                    </Flex>
                  )}
                </Field>
              </Box>
            </Box>
            <Flex
              flex="none"
              backgroundColor={colorStyle?.background?.secondary}
              alignItems="center"
              justifyContent="flex-start"
              px="6x"
              py="4x"
            >
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
          </>
        )}
      />
    </Flex>
  );
};

export default GeneralSettings;
