import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Alert,
  Box,
  Button,
  Flex,
  FormControl,
  FormErrorMessage,
  FormInput,
  FormLabel,
  Image,
  Link,
  Stack,
  Text,
} from '@tonic-ui/react';
import { ensureString } from 'ensure-type';
import _get from 'lodash/get';
import qs from 'qs';
import React, { useRef, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { Navigate, useLocation } from 'react-router-dom';
import settings from '@app/config/settings';
import * as analytics from '@app/lib/analytics';
import controller from '@app/lib/controller';
import i18n from '@app/lib/i18n';
import x from '@app/lib/json-stringify';
import log from '@app/lib/log';
import * as user from '@app/lib/user';
import config from '@app/store/config';
import { useAppStateQuery } from '@app/queries/appState';
import { useSigninMutation } from '@app/queries/session';

const required = value => {
  return ensureString(value).trim().length > 0
    ? undefined
    : i18n._('This field is required.');
};

const forgotPasswordLink = 'https://github.com/cncjs/cncjs/wiki/FAQ#forgot-your-password';

/** @returns {JSX.Element|null} */
const LoginPage = () => {
  const location = useLocation();
  const { from } = location.state || { from: { pathname: '/' } };
  const signinMutation = useSigninMutation();
  const appStateQuery = useAppStateQuery();
  const [state, setState] = useState({
    alertMessage: '',
    authenticating: false,
    redirectToReferrer: false
  });
  const methods = useForm({
    defaultValues: { name: '', password: '' },
    mode: 'onSubmit',
  });
  const { register, formState: { errors, touchedFields } } = methods;
  const authenticatingRef = useRef(false);

  const clearAlertMessage = () => {
    setState(prevState => ({
      ...prevState,
      alertMessage: '',
    }));
  };

  const handleFormSubmit = async (values) => {
    if (authenticatingRef.current || state.authenticating || signinMutation.isLoading) {
      return;
    }
    authenticatingRef.current = true;
    setState(prevState => ({
      ...prevState,
      alertMessage: '',
      authenticating: true,
      redirectToReferrer: false
    }));

    const name = _get(values, 'name');
    const password = _get(values, 'password');
    let authenticated = false;
    let token = null;

    try {
      ({ authenticated, token } = await signinMutation.mutateAsync({ name, password }));
    } catch (error) {
      authenticatingRef.current = false;
      setState(prevState => ({
        ...prevState,
        alertMessage: i18n._('Authentication failed.'),
        authenticating: false,
        redirectToReferrer: false
      }));
      return;
    }

    if (!authenticated) {
      authenticatingRef.current = false;
      setState(prevState => ({
        ...prevState,
        alertMessage: i18n._('Authentication failed.'),
        authenticating: false,
        redirectToReferrer: false
      }));
      return;
    }

    // Anonymous usage data collection
    let appState;
    try {
      ({ data: appState } = await appStateQuery.refetch({ throwOnError: true }));
    } catch (error) {
      authenticatingRef.current = false;
      setState(prevState => ({ ...prevState,
        alertMessage: i18n._('An error occurred while fetching data.'),
        authenticating: false,
        redirectToReferrer: false }));
      return;
    }
    const { allowAnonymousUsageDataCollection } = appState;
    if (allowAnonymousUsageDataCollection) {
      log.debug('Initializing anonymous usage data collection');
      analytics.initialize();
    }

    // Controller connection
    log.debug('Establishing controller connection');
    token = token || config.get('session.token');
    const host = '';
    const options = {
      query: 'token=' + token
    };
    controller.connect(host, options, () => {
      authenticatingRef.current = false;
      // @see "app/index.jsx"
      setState(prevState => ({
        ...prevState,
        alertMessage: '',
        authenticating: false,
        redirectToReferrer: true
      }));
    });
  };

  if (user.isAuthenticated()) {
    const navigateTo = '/';
    log.debug(`Navigate to ${x(navigateTo)}`);
    return (
      <Navigate to={navigateTo} />
    );
  }

  if (state.redirectToReferrer) {
    const query = qs.parse(window.location.search, { ignoreQueryPrefix: true });
    if (query && query.continue) {
      log.debug(`Navigate to the continue path ${x(query.continue)}`);
      window.location = query.continue;
      return null;
    }

    const navigateTo = from;
    log.debug(`Navigate to the referrer ${x(from.pathname)}`);
    return (
      <Navigate to={navigateTo} />
    );
  }

  return (
    <Box height="100vh">
      {state.alertMessage && (
        <Alert
          role="alert"
          aria-live="assertive"
          variant="solid"
          severity="error"
          isClosable
          onClose={clearAlertMessage}
        >
          <Box mb="1x">
            <Text fontWeight="bold">{i18n._('Error')}</Text>
          </Box>
          <Text mr="-9x">
            {state.alertMessage}
          </Text>
        </Alert>
      )}
      <Box
        width={320}
        m="0 auto"
        pt="10x"
      >
        <Stack direction="column" alignItems="center" mb="4x">
          <Image src="images/logo-square-256x256.png" width="32x" height="32x" />
          <Text fontSize="lg" lineHeight="lg" textAlign="center">
            {i18n._('Sign in to {{name}}', { name: settings.productName })}
          </Text>
        </Stack>
        <FormProvider {...methods}>
          <Box as="form" noValidate onSubmit={methods.handleSubmit(handleFormSubmit)}>
            <FormControl mb="4x" error={Boolean(errors.name && touchedFields.name)}>
              <FormLabel>{i18n._('Username')}</FormLabel>
              <FormInput
                {...register('name', { validate: required })}
                type="text"
                placeholder={i18n._('Username')}
              />
              <FormErrorMessage errors={touchedFields.name ? errors.name?.message : undefined} />
            </FormControl>
            <FormControl mb="4x" error={Boolean(errors.password && touchedFields.password)}>
              <FormLabel>{i18n._('Password')}</FormLabel>
              <FormInput
                {...register('password', { validate: required })}
                type="password"
                placeholder={i18n._('Password')}
              />
              <FormErrorMessage errors={touchedFields.password ? errors.password?.message : undefined} />
            </FormControl>
            <Box mb="4x">
              <Flex
                alignItems="center"
                justifyContent="space-between"
              >
                <Box>
                  <Link href={forgotPasswordLink}>
                    {i18n._('Forgot your password?')}
                  </Link>
                </Box>
                <Box>
                  <Button
                    disabled={state.authenticating || signinMutation.isLoading}
                    variant="primary"
                    type="submit"
                  >
                    <Flex alignItems="center" columnGap="2x">
                      {state.authenticating && (
                        <FontAwesomeIcon icon="circle-notch" spin />
                      )}
                      {!state.authenticating && (
                        <FontAwesomeIcon icon="sign-in-alt" />
                      )}
                      {i18n._('Sign In')}
                    </Flex>
                  </Button>
                </Box>
              </Flex>
            </Box>
          </Box>
        </FormProvider>
      </Box>
    </Box>
  );
};

export default LoginPage;
