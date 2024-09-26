import { createHash } from 'crypto';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Button,
  Code,
  Flex,
  Input,
  Space,
  Stack,
  Text,
  useColorStyle,
  usePortalManager,
} from '@tonic-ui/react';
import _get from 'lodash/get';
import _set from 'lodash/set';
import React, { useCallback, useRef } from 'react';
import CodePreview from '@app/components/CodePreview';
import settings from '@app/config/settings';
import useToast from '@app/hooks/useToast';
import exportFile from '@app/lib/export-file';
import i18n from '@app/lib/i18n';
import log from '@app/lib/log';
import config from '@app/store/config';
import ConfirmImportWorkspaceSettingsModal from './modals/ConfirmImportWorkspaceSettingsModal';
import ConfirmRestoreDefaultsModal from './modals/ConfirmRestoreDefaultsModal';
import { useSystemInformationQuery } from './queries';

const WorkspaceSettings = () => {
  const systemInformationQuery = useSystemInformationQuery();
  const [colorStyle] = useColorStyle();
  const portal = usePortalManager();
  const toast = useToast();
  const fileInputRef = useRef();

  const handleClickExport = useCallback(async (event) => {
    const content = await config.toJSONString();
    const hash = createHash('sha256')
      .update(content)
      .digest('hex')
      .slice(0, 8);
    const file = `${settings.name}-${settings.version}-${hash}.json`;
    exportFile(file, content);
  }, []);

  const handleClickImport = useCallback((event) => {
    const fileInput = fileInputRef.current;
    if (fileInput) {
      fileInput.value = null;
      fileInput.click();
    }
  }, []);

  const handleClickRestoreDefaults = useCallback((event) => {
    portal((close) => (
      <ConfirmRestoreDefaultsModal
        onClose={close}
        onConfirm={async () => {
          // Restore default settings
          config.restoreDefault();

          // Persist data locally
          await config.persist();

          close();

          // Reload the current page from the server
          window.location.reload(true);
        }}
      />
    ));
  }, [portal]);

  const handleChangeFile = useCallback((event) => {
    const files = event.target.files;
    const file = files[0];
    const reader = new FileReader();

    reader.onloadend = (event) => {
      const { result, error } = event.target;

      if (error) {
        log.error(error);
        return;
      }

      let data = null;
      try {
        data = JSON.parse(result) || {};
      } catch (err) {
        // Ignore
      }

      // TODO: Sanitization
      const { version, state } = { ...data };
      const isWorkspaceSettingsCorrupted = (typeof version !== 'string' || typeof state !== 'object');
      if (isWorkspaceSettingsCorrupted) {
        toast({
          appearance: 'error',
          content: (
            <Stack spacing="1x">
              <Text fontWeight="semibold">{i18n._('Import Error')}</Text>
              <Text>{i18n._('Invalid file format.')}</Text>
            </Stack>
          ),
        });
        return;
      }

      portal((close) => (
        <ConfirmImportWorkspaceSettingsModal
          data={data}
          onClose={close}
          onConfirm={async () => {
            // Persist data locally
            await config.persist({ version, state });

            close();

            // Reload the current page from the server
            window.location.reload(true);
          }}
        />
      ));
    };

    try {
      reader.readAsText(file);
    } catch (err) {
      // Ignore error
    }
  }, [portal, toast]);

  const data = JSON.parse(JSON.stringify({
    version: settings.version,
    state: config.state,
  }));
  _set(data, 'state.session.token', '********'); // Hide session token

  return (
    <>
      <Input
        ref={fileInputRef}
        type="file"
        display="none"
        multiple={false}
        onChange={handleChangeFile}
      />
      <Flex
        flexDirection="column"
        height="100%"
      >
        <Flex
          flex="none"
          columnGap="2x"
          px="4x"
          py="3x"
        >
          <Text>{i18n._('The configuration file:')}</Text>
          <Code>{_get(systemInformationQuery.data, 'userStore.file')}</Code>
        </Flex>
        <Flex
          flex="auto"
          height="100%"
          overflowY="auto"
          mx="4x"
          mb="4x"
        >
          <CodePreview
            language="json"
            data={JSON.stringify(data, null, 2)}
            showLineNumbers
            wrapLongLines
            style={{
              width: '100%',
            }}
          />
        </Flex>
        <Flex
          flex="none"
          backgroundColor={colorStyle.background.secondary}
          px="4x"
          py="3x"
          alignItems="center"
          columnGap="4x"
          justifyContent="space-between"
        >
          <Flex columnGap="2x">
            <Button
              variant="secondary"
              onClick={handleClickExport}
            >
              <FontAwesomeIcon icon="download" fixedWidth />
              <Space width="2x" />
              {i18n._('Export')}
            </Button>
            <Button
              variant="secondary"
              onClick={handleClickImport}
            >
              <FontAwesomeIcon icon="upload" fixedWidth />
              <Space width="2x" />
              {i18n._('Import')}
            </Button>
          </Flex>
          <Flex>
            <Button
              variant="secondary"
              onClick={handleClickRestoreDefaults}
            >
              {i18n._('Restore Defaults')}
            </Button>
          </Flex>
        </Flex>
      </Flex>
    </>
  );
};

export default WorkspaceSettings;
