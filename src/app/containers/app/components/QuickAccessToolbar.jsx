import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Box, Button, ButtonGroup, Flex, Space } from '@tonic-ui/react';
import React from 'react';
import { CONNECTION_STATE_CONNECTED } from '@app/constants/connection';
import useConnection from '@app/hooks/useConnection';
import i18n from '@app/lib/i18n';

const buttonColors = {
  neutral: { background: '#ffffff', hover: '#e6e6e6', active: '#d4d4d4', text: '#333333' },
  info: { background: '#337ab7', hover: '#286090', active: '#204d74', text: '#ffffff' },
  success: { background: '#5cb85c', hover: '#449d44', active: '#398439', text: '#ffffff' },
  warning: { background: '#f0ad4e', hover: '#ec971f', active: '#d58512', text: '#ffffff' },
  error: { background: '#d9534f', hover: '#c9302c', active: '#ac2925', text: '#ffffff' },
};

const commandGroups = [
  [
    { command: 'cycle_start', label: 'Cycle Start', icon: 'repeat' },
    { command: 'feed_hold', label: 'Feedhold', icon: 'hand-paper' },
  ],
  [
    { command: 'homing', label: 'Homing', icon: 'home', color: 'info' },
    { command: 'sleep', label: 'Sleep', icon: 'bed', color: 'success' },
    { command: 'unlock', label: 'Unlock', icon: 'unlock-alt', color: 'warning' },
    { command: 'reset', label: 'Reset', icon: 'undo', color: 'error' },
  ],
];

/** Workspace controller commands. No props. */
function QuickAccessToolbar() {
  const connection = useConnection();

  return (
    <Box minWidth="0" flex="1" alignSelf="center" overflowX="auto" ml="2x" mr="4x">
      <Flex role="toolbar" aria-label="Quick access toolbar" gap="2x" width="max-content" ml="auto" py="1x">
        {commandGroups.map((group, index) => (
          <ButtonGroup key={index} size="md" disabled={connection.state !== CONNECTION_STATE_CONNECTED}>
            {group.map(({ command, label, icon, color = 'neutral' }) => (
              <Button
                key={command}
                title={i18n._(label)}
                onClick={() => connection.command(command)}
                backgroundColor={buttonColors[color].background}
                color={buttonColors[color].text}
                borderColor="rgba(0, 0, 0, 0.2)"
                _hover={{
                  backgroundColor: buttonColors[color].hover,
                  color: buttonColors[color].text,
                }}
                _active={{
                  backgroundColor: buttonColors[color].active,
                  color: buttonColors[color].text,
                }}
                _disabled={{
                  backgroundColor: buttonColors[color].background,
                  color: buttonColors[color].text,
                  opacity: 0.55,
                  cursor: 'not-allowed',
                }}
              >
                <FontAwesomeIcon icon={icon} fixedWidth />
                <Space width="2x" />
                {i18n._(label)}
              </Button>
            ))}
          </ButtonGroup>
        ))}
      </Flex>
    </Box>
  );
}

export default QuickAccessToolbar;
