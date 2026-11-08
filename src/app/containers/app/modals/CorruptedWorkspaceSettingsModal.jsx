import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Alert,
  Box,
  Button,
  Flex,
  Link,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalOverlay,
} from '@tonic-ui/react';
import React, { useEffect, useState } from 'react';
import settings from '@app/config/settings';
import i18n from '@app/lib/i18n';
import config from '@app/store/config';

const reloadPage = () => {
  window.location.reload(true);
};

/**
 * @returns {JSX.Element}
 */
function CorruptedWorkspaceSettingsModal() {
  const [url, setUrl] = useState();
  const filename = `${settings.name}-${settings.version}.json`;

  useEffect(() => {
    let active = true;

    (async () => {
      const content = await config.toJSONString();
      if (active) {
        setUrl(`data:text/plain;charset=utf-8,${encodeURIComponent(content)}`);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const restoreDefaults = async () => {
    config.restoreDefault();
    await config.persist();
    reloadPage();
  };

  return (
    <Modal
      autoFocus
      closeOnEsc={false}
      closeOnInteractOutside={false}
      ensureFocus
      isClosable={false}
      isOpen
      onClose={() => {}}
    >
      <ModalOverlay />
      <ModalContent>
        <ModalBody>
          <Alert severity="error">
            <Box fontWeight="bold">{i18n._('Corrupted workspace settings')}</Box>
            <Box>
              {i18n._('The workspace settings have become corrupted or invalid. Click Restore Defaults to restore default settings and continue.')}
              <Flex
                as={Link}
                align="center"
                download={filename}
                gap="2x"
                href={url}
                mt="2x"
              >
                <FontAwesomeIcon aria-hidden="true" icon="download" />
                {i18n._('Download workspace settings')}
              </Flex>
            </Box>
          </Alert>
        </ModalBody>
        <ModalFooter>
          <Button onClick={restoreDefaults} variant="danger">
            {i18n._('Restore Defaults')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default CorruptedWorkspaceSettingsModal;
