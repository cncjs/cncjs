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
function Controller({ controllerSettings, controllerState, onClose }) {
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
        <ModalHeader>Marlin</ModalHeader>
        <ModalBody>
          <Tabs>
            <TabList aria-label={i18n._('Marlin controller data')}>
              <Tab>{i18n._('Controller State')}</Tab>
              <Tab>{i18n._('Controller Settings')}</Tab>
            </TabList>
            <TabPanels px="3x" py="2x">
              <TabPanel>
                <ControllerData value={controllerState} />
              </TabPanel>
              <TabPanel>
                <Box sx={previewSx}>
                  <Box sx={{ position: 'absolute', right: 10, top: 10 }}>
                    <Button
                      size="xs"
                      onClick={() => {
                        controller.writeln('$#');
                        controller.writeln('$$');
                      }}
                    >
                      <RefreshIcon aria-hidden="true" size="1em" />
                      {i18n._('Refresh')}
                    </Button>
                  </Box>
                  <ControllerData value={controllerSettings} bare />
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
 * @param {{ bare?: boolean, value?: object }} props
 */
function ControllerData({ bare = false, value }) {
  const content = (
    <Box
      as="pre"
      sx={{
        background: 'inherit',
        border: 0,
        color: 'inherit',
        fontFamily: 'mono',
        margin: 0,
        padding: '8px 12px',
      }}
    >
      <code>{JSON.stringify(value, null, 2)}</code>
    </Box>
  );

  return bare ? content : <Box sx={previewSx}>{content}</Box>;
}

const previewSx = {
  background: 'background._fixed.dark.low',
  border: 1,
  borderColor: 'border._fixed.dark.secondary',
  color: 'text._fixed.dark.primary',
  height: 'max(50vh, 200px)',
  overflowY: 'auto',
  position: 'relative',
};

export default Controller;
