import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Alert,
  Box,
  Button,
  Collapse,
  Flex,
  Image,
  Link,
  Spinner,
  Stack,
  Text,
} from '@tonic-ui/react';
import {
  useEffectOnce,
  useToggle,
} from '@tonic-ui/react-hooks';
import { useActor, useInterpret } from '@xstate/react';
import memoize from 'micro-memoize';
import React, { useEffect } from 'react';
import settings from 'app/config/settings';
import i18n from 'app/lib/i18n';
import semverLt from 'semver/functions/lt';
import AlertLinkButton from './AlertLinkButton';
import { StateContext } from './context';
import { fetchVersionMachine } from './machines';

const getMemoizedState = memoize(state => ({ ...state }));

let defaultWillShowUpdateAlert = true;

const About = () => {
  const fetchVersionService = useInterpret(fetchVersionMachine);
  const [state, send] = useActor(fetchVersionService);
  const value = getMemoizedState({
    fetchVersionService,
  });
  const currentVersion = settings.version;
  const latestVersion = state.context?.data?.data?.version;
  const isCheckingForUpdates = (state.value === 'loading');
  const isUpdateAvailable = currentVersion && latestVersion && semverLt(currentVersion, latestVersion);
  const isLatestVersion = currentVersion && latestVersion && !semverLt(currentVersion, latestVersion);
  const [isUpdateAlertVisible, toggleUpdateAlertVisible] = useToggle(false);

  useEffectOnce(() => {
    send({ type: 'FETCH' });
  });

  useEffect(() => {
    if (isUpdateAvailable && defaultWillShowUpdateAlert) {
      toggleUpdateAlertVisible();
    }
  }, [isUpdateAvailable, toggleUpdateAlertVisible]);

  return (
    <StateContext.Provider value={value}>
      <Collapse in={isUpdateAlertVisible}>
        <Alert
          isClosable
          onClose={() => {
            toggleUpdateAlertVisible(false);
            defaultWillShowUpdateAlert = false;
          }}
          variant="solid"
          severity="info"
        >
          <Flex alignItems="flex-start" justifyContent="space-between">
            <Box mr="10x">
              <Text>
                {i18n._('A new version of {{name}} is available: {{version}}', {
                  name: settings.productName,
                  version: latestVersion,
                })}
              </Text>
            </Box>
            <AlertLinkButton
              variant="secondary"
              size="sm"
              href={settings.url.releases}
              target="_blank"
            >
              <Flex alignItems="center" columnGap="2x">
                {i18n._('Latest version')}
                <FontAwesomeIcon icon="external-link" fixedWidth />
              </Flex>
            </AlertLinkButton>
          </Flex>
        </Alert>
      </Collapse>
      <Box mx="4x" my="3x">
        <Stack spacing="4x" mb="8x">
          <Flex alignItems="center" columnGap="2x">
            <Image src="images/logo-square-256x256.png" alt="" width={96} />
            <Box>
              <Box mb="2x">
                <Text fontSize="md" lineHeight="md">
                  {`${settings.productName} ${settings.version}`}
                </Text>
                <Text>
                  {i18n._('A web-based interface for CNC milling controller running Grbl, Marlin, Smoothieware, or TinyG')}
                </Text>
              </Box>
              <Link
                href={settings.url.wiki}
                target="_blank"
              >
                {i18n._('Learn more')}
              </Link>
            </Box>
          </Flex>
          <Flex alignItems="center" columnGap="2x">
            <Button
              onClick={() => {
                const url = 'https://github.com/cncjs/cncjs/releases';
                window.open(url, '_blank');
              }}
            >
              {i18n._('Downloads')}
            </Button>
            <Button
              onClick={() => {
                const url = 'https://github.com/cncjs/cncjs/issues';
                window.open(url, '_blank');
              }}
            >
              {i18n._('Report an issue')}
            </Button>
          </Flex>
        </Stack>
        {isCheckingForUpdates && (
          <Flex alignItems="center" columnGap="2x">
            <Spinner size="xs" />
            <Text>
              {i18n._('Checking for updates...')}
            </Text>
          </Flex>
        )}
        {isLatestVersion && (
          <Flex alignItems="center" columnGap="2x">
            <FontAwesomeIcon icon="check-circle" fixedWidth />
            <Text>
              {i18n._('You already have the newest version of {{name}}', { name: settings.productName })}
            </Text>
          </Flex>
        )}
      </Box>
    </StateContext.Provider>
  );
};

export default About;
