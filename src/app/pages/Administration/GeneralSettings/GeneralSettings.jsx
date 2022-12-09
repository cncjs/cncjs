import {
  Box,
  Button,
  Divider,
  Flex,
  Icon,
  Spinner,
  Text,
  Toast,
  ToastController,
  ToastTransition,
  useColorMode,
  useColorStyle,
} from '@tonic-ui/react';
import {
  useEffectOnce,
} from '@tonic-ui/react-hooks';
import { useActor, useInterpret } from '@xstate/react';
import React, { useCallback, useState } from 'react';
import { Form, FormSpy } from 'react-final-form';
import { TransitionGroup } from 'react-transition-group';
import { v4 as uuidv4 } from 'uuid';
import axios from 'app/api/axios';
import i18n from 'app/lib/i18n';
import { createFetchMachine } from 'app/machines';
import FieldCheckbox from 'app/pages/Administration/components/FieldCheckbox';
import Overlay from 'app/pages/Administration/components/Overlay';
import TitleText from 'app/pages/Administration/components/TitleText';

const fetchMachine = createFetchMachine();

const ToastContainer = (props) => (
  <Box
    position="absolute"
    top="4x"
    left="50%"
    transform="translateX(-50%)"
    width="max-content"
    maxWidth="80%" // 80% of the container width
    zIndex="toast"
    {...props}
  />
);

const GeneralSettings = () => {
  const [formState, setFormState] = useState({});
  const [colorMode] = useColorMode();
  const [colorStyle] = useColorStyle({ colorMode });
  const [toasts, setToasts] = useState([]);
  const addToast = (options) => {
    const {
      appearance,
      content,
      duration = null,
      isClosable = true,
    } = { ...options };

    setToasts(prevState => {
      const id = uuidv4();
      const onClose = () => {
        setToasts(toasts => toasts.filter(x => x.id !== id));
      };
      // You can decide how many toasts you want to show at the same time depending on your use case
      const nextState = [
        ...prevState.slice(-2),
        {
          id,
          appearance,
          content,
          duration,
          isClosable,
          onClose,
        },
      ];
      return nextState;
    });
  };
  const removeToasts = useCallback(() => setToasts([]), []);
  const getterService = useInterpret(
    fetchMachine,
    {
      actions: {
        onSuccess: (context, event) => {
          const data = context.data.data;
          setFormState(data);
        },
        onFailure: (context, event) => {
          addToast({
            appearance: 'error',
            content: (
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
          addToast({
            appearance: 'success',
            duration: 3000,
            content: (
              <Text>{i18n._('Settings saved.')}</Text>
            ),
          });

          getterDispatch({ type: 'FETCH' });
        },
        onFailure: (context, event) => {
          addToast({
            appearance: 'error',
            content: (
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
    removeToasts();
    getterDispatch({ type: 'FETCH' });
  }, [removeToasts, getterDispatch]);
  const handleFormSubmit = useCallback((values) => {
    removeToasts();
    setterDispatch({
      type: 'FETCH',
      data: values,
    });
  }, [removeToasts, setterDispatch]);

  useEffectOnce(() => {
    removeToasts();
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
          <ToastContainer>
            <TransitionGroup
              component={null} // Pass in `component={null}` to avoid a wrapping `<div>` element
            >
              {toasts.map(toast => (
                <ToastTransition
                  in={true}
                  key={toast?.id}
                  unmountOnExit
                >
                  <ToastController
                    duration={toast?.duration}
                    onClose={toast?.onClose}
                  >
                    <Toast
                      appearance={toast?.appearance}
                      isClosable={toast?.isClosable}
                      onClose={toast?.onClose}
                      mb="2x"
                      minWidth={280}
                    >
                      {toast?.content}
                    </Toast>
                  </ToastController>
                </ToastTransition>
              ))}
            </TransitionGroup>
          </ToastContainer>
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
