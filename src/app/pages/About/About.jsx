import {
  Alert,
  Box,
  Button,
  Collapse,
  Flex,
  Icon,
  Image,
  Link,
  Spinner,
  Stack,
  Text,
  useColorStyle,
} from '@tonic-ui/react';
import {
  ExternalLinkIcon,
  SuccessIcon,
} from '@tonic-ui/react-icons';
import {
  useToggle,
} from '@tonic-ui/react-hooks';
import React, { useEffect } from 'react';
import semverLt from 'semver/functions/lt';
import settings from '@app/config/settings';
import useToast from '@app/hooks/useToast';
import i18n from '@app/lib/i18n';
import AlertButtonLink from './components/AlertButtonLink';
import { useLatestVersionQuery } from './queries';

const About = () => {
  const [colorStyle] = useColorStyle();
  const toast = useToast();
  const latestVersionQuery = useLatestVersionQuery({
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
  const currentVersion = settings.version;
  const latestVersion = latestVersionQuery?.data?.version;
  const isCheckingForUpdates = latestVersionQuery.isFetching;
  const isUpdateAvailable = currentVersion && latestVersion && semverLt(currentVersion, latestVersion);
  const isLatestVersion = currentVersion && latestVersion && !semverLt(currentVersion, latestVersion);
  const [isUpdateAlertVisible, toggleUpdateAlertVisible] = useToggle(false);

  useEffect(() => {
    if (isUpdateAvailable) {
      toggleUpdateAlertVisible();
    }
    toggleUpdateAlertVisible(true);
  }, [isUpdateAvailable, toggleUpdateAlertVisible]);

  return (
    <Box>
      <Collapse in={isUpdateAlertVisible}>
        <Alert
          isClosable
          onClose={() => {
            toggleUpdateAlertVisible(false);
          }}
          variant="solid"
          severity="info"
        >
          <Flex
            alignItems="flex-start"
            justifyContent="space-between"
          >
            <Box mr="10x">
              <Text>
                {i18n._('A new version of {{name}} is available: {{version}}', {
                  name: settings.productName,
                  version: latestVersion,
                })}
              </Text>
            </Box>
            <AlertButtonLink
              href={settings.url.releases}
              target="_blank"
            >
              <Flex alignItems="center" columnGap="2x">
                {i18n._('Latest version')}
                <Icon as={ExternalLinkIcon} />
              </Flex>
            </AlertButtonLink>
          </Flex>
        </Alert>
      </Collapse>
      <Box px="6x" py="4x">
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
              variant="secondary"
              onClick={() => {
                const url = 'https://github.com/cncjs/cncjs/releases';
                window.open(url, '_blank');
              }}
            >
              {i18n._('Downloads')}
            </Button>
            <Button
              variant="secondary"
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
            <Icon as={SuccessIcon} color={colorStyle.component.alert.solid.success} />
            <Text>
              {i18n._('You already have the newest version of {{name}}', { name: settings.productName })}
            </Text>
          </Flex>
        )}
      </Box>
    </Box>
  );
};

export default About;
