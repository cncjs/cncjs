import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Alert,
  Box,
  Button,
  Flex,
  Image,
  Input,
  Link,
  Stack,
  Text,
} from '@tonic-ui/react';
import { ensureString } from 'ensure-type';
import _get from 'lodash/get';
import qs from 'qs';
import React, { useState } from 'react';
import { Form, Field } from 'react-final-form';
import { Navigate, useLocation } from 'react-router-dom';
import FormGroup from '@app/components/FormGroup';
import InlineError from '@app/components/InlineError';
import settings from '@app/config/settings';
import controller from '@app/lib/controller';
import i18n from '@app/lib/i18n';
import x from '@app/lib/json-stringify';
import log from '@app/lib/log';
import * as user from '@app/lib/user';
import config from '@app/store/config';

const required = value => {
  return ensureString(value).trim().length > 0
    ? undefined
    : i18n._('This field is required.');
};

const forgotPasswordLink = 'https://cnc.js.org/docs/faq/#forgot-your-password';

const LoginPage = () => {
  const location = useLocation();
  const { from } = location.state || { from: { pathname: '/' } };
  const [state, setState] = useState({
    alertMessage: '',
    authenticating: false,
    redirectToReferrer: false
  });

  const clearAlertMessage = () => {
    setState(prevState => ({
      ...prevState,
      alertMessage: '',
    }));
  };

  const handleFormSubmit = async (values, form) => {
    setState(prevState => ({
      ...prevState,
      alertMessage: '',
      authenticating: true,
      redirectToReferrer: false
    }));

    const name = _get(values, 'name');
    const password = _get(values, 'password');
    const { authenticated } = await user.signin({ name, password });

    if (!authenticated) {
      setState(prevState => ({
        ...prevState,
        alertMessage: i18n._('Authentication failed.'),
        authenticating: false,
        redirectToReferrer: false
      }));
      return;
    }

    log.debug('Create and establish a WebSocket connection');

    const token = config.get('session.token');
    const host = '';
    const options = {
      query: 'token=' + token
    };
    controller.connect(host, options, () => {
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
        <Form
          onSubmit={handleFormSubmit}
          render={({ handleSubmit, values }) => (
            <>
              <FormGroup>
                <Field
                  name="name"
                  validate={required}
                >
                  {({ input, meta }) => (
                    <>
                      <Input
                        {...input}
                        type="text"
                        placeholder={i18n._('Username')}
                      />
                      {(meta.error && meta.touched) && (
                        <InlineError>{meta.error}</InlineError>
                      )}
                    </>
                  )}
                </Field>
              </FormGroup>
              <FormGroup>
                <Field
                  name="password"
                  validate={required}
                >
                  {({ input, meta }) => (
                    <>
                      <Input
                        {...input}
                        type="password"
                        placeholder={i18n._('Password')}
                      />
                      {(meta.error && meta.touched) && (
                        <InlineError>{meta.error}</InlineError>
                      )}
                    </>
                  )}
                </Field>
              </FormGroup>
              <FormGroup>
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
                      variant="primary"
                      onClick={handleSubmit}
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
              </FormGroup>
            </>
          )}
        />
      </Box>
    </Box>
  );
};

export default LoginPage;
