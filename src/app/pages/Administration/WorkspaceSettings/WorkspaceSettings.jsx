import { createHash } from 'crypto';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Button,
  Divider,
  Flex,
  Icon,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  Space,
  Stack,
  Text,
  useColorMode,
  useColorStyle,
} from '@tonic-ui/react';
import React, { useCallback, useRef } from 'react';
import CodePreview from 'app/components/CodePreview';
import { usePortalManager } from 'app/components/PortalManager';
import settings from 'app/config/settings';
import exportFile from 'app/lib/export-file';
import i18n from 'app/lib/i18n';
import log from 'app/lib/log';
import config from 'app/store/config';

const WorkspaceSettings = () => {
  const [colorMode] = useColorMode();
  const [colorStyle] = useColorStyle({ colorMode });
  const portalManager = usePortalManager();
  const fileInputRef = useRef();

  const handleClickExport = useCallback((event) => {
    const content = config.toJSONString();
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
    portalManager.add(({ remove }) => (
      <Modal
        isClosable
        isOpen={true}
        onClose={remove}
        size="sm"
      >
        <ModalContent>
          <ModalBody>
            <Flex columnGap="4x">
              <Icon
                icon=":modal-warning"
                color={colorStyle.severity.medium}
                size="12x"
              />
              <Stack spacing="1x">
                <Text fontWeight="semibold">{i18n._('Warning')}</Text>
                <Text>{i18n._('Are you sure you want to restore the default settings?')}</Text>
              </Stack>
            </Flex>
          </ModalBody>
          <ModalFooter columnGap="2x">
            <Button onClick={remove}>
              {i18n._('Cancel')}
            </Button>
            <Button
              variant="emphasis"
              onClick={() => {
                // Restore default settings
                config.restoreDefault();

                // Persist data locally
                config.persist();

                // Reload the current page from the server
                window.location.reload(true);
              }}
            >
              {i18n._('Restore Defaults')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    ));
  }, [portalManager, colorStyle]);

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
      const isValidWorkspaceSettings = (typeof version === 'string' && typeof state === 'object');

      if (!isValidWorkspaceSettings) {
        portalManager.add(({ remove }) => (
          <Modal
            isClosable
            isOpen={true}
            onClose={remove}
            size="xs"
          >
            <ModalContent>
              <ModalBody>
                <Flex columnGap="4x">
                  <Icon
                    icon=":modal-error"
                    color={colorStyle.severity.high}
                    size="12x"
                  />
                  <Stack spacing="1x">
                    <Text fontWeight="semibold">{i18n._('Import Error')}</Text>
                    <Text>{i18n._('Invalid file format.')}</Text>
                  </Stack>
                </Flex>
              </ModalBody>
              <ModalFooter>
                <Button onClick={remove}>
                  {i18n._('Close')}
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        ));
      } else {
        portalManager.add(({ remove }) => (
          <Modal
            isClosable
            isOpen={true}
            onClose={remove}
            size="sm"
          >
            <ModalContent>
              <ModalBody>
                <Flex columnGap="4x" mb="6x">
                  <Icon
                    icon=":modal-warning"
                    color={colorStyle.severity.medium}
                    size="12x"
                  />
                  <Stack spacing="1x">
                    <Text fontWeight="semibold">{i18n._('Warning')}</Text>
                    <Text>{i18n._('Are you sure you want to overwrite the workspace settings?')}</Text>
                  </Stack>
                </Flex>
                <CodePreview
                  data={JSON.stringify(data, null, 2)}
                  language="json"
                />
              </ModalBody>
              <ModalFooter columnGap="2x">
                <Button onClick={remove}>
                  {i18n._('Cancel')}
                </Button>
                <Button
                  variant="emphasis"
                  onClick={() => {
                    // Persist data locally
                    config.persist(data);

                    // Reload the current page from the server
                    window.location.reload(true);
                  }}
                >
                  <FontAwesomeIcon icon="upload" fixedWidth />
                  <Space width="2x" />
                  {i18n._('Import')}
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        ));
      }
    };

    try {
      reader.readAsText(file);
    } catch (err) {
      // Ignore error
    }
  }, [portalManager, colorStyle]);

  return (
    <Flex
      flexDirection="column"
      height="100%"
    >
      <Input
        ref={fileInputRef}
        type="file"
        display="none"
        multiple={false}
        onChange={handleChangeFile}
      />
      <Flex
        flex="none"
        justifyContent="space-between"
        px="4x"
        py="3x"
      >
        <Flex columnGap="2x">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleClickExport}
          >
            <FontAwesomeIcon icon="download" fixedWidth />
            <Space width="2x" />
            {i18n._('Export')}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleClickImport}
          >
            <FontAwesomeIcon icon="upload" fixedWidth />
            <Space width="2x" />
            {i18n._('Import')}
          </Button>
        </Flex>
        <Button
          variant="emphasis"
          onClick={handleClickRestoreDefaults}
        >
          {i18n._('Restore Defaults')}
        </Button>
      </Flex>
      <Divider mb="4x" />
      <Flex
        flex="auto"
        height="100%"
        overflowY="auto"
        px="4x"
        mb="4x"
      >
        <CodePreview
          data={JSON.stringify({
            version: settings.version,
            state: config.state
          }, null, 2)}
          language="json"
        />
      </Flex>
    </Flex>
  );
};

export default WorkspaceSettings;
