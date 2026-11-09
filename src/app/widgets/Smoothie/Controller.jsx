import {
  Box,
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
} from '@tonic-ui/react';
import { RefreshIcon } from '@tonic-ui/react-icons';
import React from 'react';
import controller from '@app/lib/controller';
import i18n from '@app/lib/i18n';

/**
 * @param {{
 *   controllerSettings?: object,
 *   controllerState?: object,
 *   onClose: () => void,
 * }} props
 */
function Controller({ controllerSettings = {}, controllerState = {}, onClose }) {
  return (
    <Modal
      autoFocus
      closeOnEsc
      closeOnInteractOutside={false}
      ensureFocus
      isClosable
      isOpen
      size="lg"
      onClose={onClose}
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Smoothie</ModalHeader>
        <ModalBody>
          <Tabs>
            <TabList aria-label={i18n._('Smoothie controller data')}>
              <Tab>{i18n._('Controller State')}</Tab>
              <Tab>{i18n._('Controller Settings')}</Tab>
            </TabList>
            <TabPanels px="3x" py="2x">
              <TabPanel>
                <PreviewCode>{JSON.stringify(controllerState, null, 2)}</PreviewCode>
              </TabPanel>
              <TabPanel>
                <Box sx={previewSx}>
                  <Box sx={{ position: 'absolute', right: 10, top: 10 }}>
                    <Button size="xs" onClick={() => controller.writeln('$#')}>
                      <RefreshIcon aria-hidden="true" size="1em" />
                      {i18n._('Refresh')}
                    </Button>
                  </Box>
                  <Box
                    as="pre" m={0} p="3x"
                    whiteSpace="pre-wrap"
                  >
                    <code>{JSON.stringify(controllerSettings, null, 2)}</code>
                  </Box>
                </Box>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose}>{i18n._('Close')}</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

/**
 * @param {{ children: React.ReactNode }} props
 */
function PreviewCode({ children }) {
  return (
    <Box sx={previewSx}>
      <Box
        as="pre" m={0} p="3x"
        whiteSpace="pre-wrap"
      ><code>{children}</code>
      </Box>
    </Box>
  );
}

const previewSx = {
  background: 'background._fixed.dark.low',
  border: 1,
  borderColor: 'border.secondary',
  color: 'text._fixed.dark.primary',
  height: 'max(50vh, 200px)',
  overflowY: 'auto',
  position: 'relative',
};

export default Controller;
