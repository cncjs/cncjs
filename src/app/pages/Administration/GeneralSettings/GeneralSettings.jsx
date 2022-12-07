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
import {
  useConst,
  useEffectOnce,
  useToggle,
} from '@tonic-ui/react-hooks';
import { useActor, useInterpret } from '@xstate/react';
import React, { useCallback, useState } from 'react';
import { Form, FormSpy } from 'react-final-form';
import axios from 'app/api/axios';
import ToastNotification from 'app/components/ToastNotification';
import i18n from 'app/lib/i18n';
import { createFetchMachine } from 'app/machines';
import FieldCheckbox from 'app/pages/Administration/components/FieldCheckbox';
import Overlay from 'app/pages/Administration/components/Overlay';
import TitleText from 'app/pages/Administration/components/TitleText';

const fetchMachine = createFetchMachine();

const GeneralSettings = () => {
  const [formState, setFormState] = useState({});
  const [colorMode] = useColorMode();
  const [colorStyle] = useColorStyle({ colorMode });
  const toast = useConst(() => ({
    autoClose: false,
    appearance: 'none',
    message: null,
  }));
  const [isToastOpen, toggleIsToastOpen] = useToggle();
  const openToast = useCallback((props) => {
    toast.autoClose = props?.autoClose;
    toast.appearance = props?.appearance;
    toast.message = props?.message;
    toggleIsToastOpen(true);
  }, [toast, toggleIsToastOpen]);
  const closeToast = useCallback(() => {
    toast.autoClose = false;
    toast.apperance = 'none';
    toast.message = null;
    toggleIsToastOpen(false);
  }, [toast, toggleIsToastOpen]);
  const getterService = useInterpret(
    fetchMachine,
    {
      actions: {
        onSuccess: (context, event) => {
          const data = context.data.data;
          setFormState(data);
        },
        onFailure: (context, event) => {
          openToast({
            autoClose: false,
            appearance: 'error',
            message: (
              <Text>{i18n._('An unexpected error has occurred.')}</Text>
            ),
          });
        },
      },
      services: {
        fetch: (context, event) => {
          const url = '/api/state';
          return axios.get(url, event?.config);
        }
      },
    },
  );
  const setterService = useInterpret(
    fetchMachine,
    {
      actions: {
        onSuccess: (context, event) => {
          openToast({
            autoClose: true,
            appearance: 'success',
            message: (
              <Text>{i18n._('Settings saved.')}</Text>
            ),
          });

          getterDispatch({ type: 'FETCH' });
        },
        onFailure: (context, event) => {
          openToast({
            autoClose: false,
            appearance: 'error',
            message: (
              <Text>{i18n._('An unexpected error has occurred.')}</Text>
            ),
          });
        },
      },
      services: {
        fetch: (context, event) => {
          const url = '/api/state';
          return axios.post(url, event?.data, event?.config);
        }
      },
    },
  );
  const [getterState, getterDispatch] = useActor(getterService);
  const [setterState, setterDispatch] = useActor(setterService);
  const handleClickRetry = useCallback((event) => {
    closeToast();
    getterDispatch({ type: 'FETCH' });
  }, [closeToast, getterDispatch]);
  const handleFormSubmit = useCallback((values) => {
    closeToast();
    setterDispatch({
      type: 'FETCH',
      data: values,
    });
  }, [closeToast, setterDispatch]);

  useEffectOnce(() => {
    closeToast();
    getterDispatch({ type: 'FETCH' });
  });

  const isLoading = getterState.matches('loading') || setterState.matches('loading');
  const isFormDisabled = isLoading || getterState.matches('failure');
  const shouldRetryFailure = getterState.matches('failure');

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
          {isLoading && (
            <Overlay
              alignItems="center"
              justifyContent="center"
            >
              <Spinner size="md" />
            </Overlay>
          )}
          <Flex
            justifyContent="center"
            position="absolute"
            mt="4x"
            width="100%"
          >
            <ToastNotification
              TransitionProps={{
                maxWidth: '80%',
              }}
              appearance={toast.appearance}
              autoClose={toast.autoClose}
              isClosable
              isOpen={isToastOpen}
              onClose={closeToast}
            >
              {toast.message}
            </ToastNotification>
          </Flex>
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
                <Icon icon="warning-circle" color={colorStyle.color.error} />
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
                pristine: true,
              }}
            >
              {({ invalid, pristine }) => {
                const canSave = (() => {
                  if (invalid) {
                    return false;
                  }
                  if (pristine) {
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
                    {shouldRetryFailure ? (
                      <Button
                        variant="primary"
                        onClick={handleClickRetry}
                      >
                        {i18n._('Retry')}
                      </Button>
                    ) : (
                      <Button
                        justifySelf="flex-end"
                        variant="primary"
                        disabled={!canSave}
                        onClick={handleClickSave}
                      >
                        {i18n._('Save')}
                      </Button>
                    )}
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
