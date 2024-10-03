import { useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Collapse,
  Flex,
  Icon,
  Image,
  Link,
  Stack,
  Text,
  useColorStyle,
} from '@tonic-ui/react';
import {
  ExternalLinkIcon,
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
import {
  API_STATE_QUERY_KEY,
  useGetLatestVersionQuery,
  useGetStateQuery,
  useSetStateMutation,
} from './queries';

const About = () => {
  const [colorStyle] = useColorStyle();
  const toast = useToast();
  const queryClient = useQueryClient();
  const getLatestVersionQuery = useGetLatestVersionQuery();
  const getStateQuery = useGetStateQuery();
  const setStateMutation = useSetStateMutation({
    onSuccess: () => {
      // Invalidate `getStateQuery`
      queryClient.invalidateQueries({ queryKey: API_STATE_QUERY_KEY });
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
  const currentVersion = settings.version;
  const latestVersion = getLatestVersionQuery?.data?.version;
  const isCheckingForUpdates = getLatestVersionQuery.isFetching;
  const isUpdateAvailable = currentVersion && latestVersion && semverLt(currentVersion, latestVersion);
  const isLatestVersion = currentVersion && latestVersion && !semverLt(currentVersion, latestVersion);
  const [isUpdateAlertVisible, toggleUpdateAlertVisible] = useToggle(false);

  useEffect(() => {
    if (isUpdateAvailable) {
      toggleUpdateAlertVisible(true);
    }
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
        <Box mb="6x">
          <Checkbox
            disabled={getStateQuery.isFetching}
            checked={getStateQuery.data?.checkForUpdates}
            onChange={(event) => {
              const checked = event.currentTarget.checked;
              const data = {
                checkForUpdates: checked,
              };
              setStateMutation.mutate({ data });
            }}
          >
            <Text>
              {i18n._('Automatically check for updates')}
            </Text>
          </Checkbox>
        </Box>
        <Box mb="2x">
          <Button
            variant="secondary"
            onClick={() => {
              getLatestVersionQuery.refetch();
            }}
          >
            {i18n._('Check for updates')}
          </Button>
        </Box>
        {isCheckingForUpdates && (
          <Flex alignItems="center" columnGap="2x">
            <Text>
              {i18n._('Checking for updates...')}
            </Text>
          </Flex>
        )}
        {!isCheckingForUpdates && isLatestVersion && (
          <Flex alignItems="center" columnGap="2x">
            <Text>
              {i18n._('{{name}} is up to date.', { name: settings.productName })}
            </Text>
          </Flex>
        )}
      </Box>
    </Box>
  );
};

export default About;
