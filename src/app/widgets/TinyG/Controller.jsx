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
import React from 'react';
import i18n from '@app/lib/i18n';

/**
 * @param {{
 *   controllerData: { settings?: object, state?: object },
 *   onClose: () => void,
 * }} props
 */
function Controller({ controllerData, onClose }) {
  return (
    <Modal
      autoFocus
      closeOnEsc
      closeOnInteractOutside={false}
      ensureFocus
      isClosable
      isOpen
      onClose={onClose}
      size="lg"
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>TinyG</ModalHeader>
        <ModalBody>
          <Tabs>
            <TabList aria-label={i18n._('TinyG controller data')}>
              <Tab>{i18n._('Controller State')}</Tab>
              <Tab>{i18n._('Controller Settings')}</Tab>
            </TabList>
            <TabPanels px="3x" py="2x">
              <TabPanel>
                <ControllerData>{JSON.stringify(controllerData.state, null, 2)}</ControllerData>
              </TabPanel>
              <TabPanel>
                <ControllerData>{JSON.stringify(controllerData.settings, null, 2)}</ControllerData>
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

/** @param {{ children?: React.ReactNode }} props */
function ControllerData({ children }) {
  return (
    <Box
      as="pre"
      sx={{
        background: 'background._fixed.dark.low',
        border: 1,
        borderColor: 'border.secondary',
        color: 'text._fixed.dark.primary',
        fontFamily: 'Consolas, Menlo, Monaco, monospace',
        height: 'max(50vh, 200px)',
        margin: 0,
        overflowY: 'auto',
        padding: '8px 12px',
      }}
    >
      {children}
    </Box>
  );
}

export default Controller;
