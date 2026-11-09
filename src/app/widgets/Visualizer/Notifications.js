import {
  Box,
  Link,
  Space,
  Text,
  Toast,
} from '@tonic-ui/react';
import React from 'react';
import i18n from '@app/lib/i18n';
import {
  NOTIFICATION_PROGRAM_ERROR,
  NOTIFICATION_M0_PROGRAM_PAUSE,
  NOTIFICATION_M1_PROGRAM_PAUSE,
  NOTIFICATION_M2_PROGRAM_END,
  NOTIFICATION_M30_PROGRAM_END,
  NOTIFICATION_M6_TOOL_CHANGE,
  NOTIFICATION_M109_SET_EXTRUDER_TEMPERATURE,
  NOTIFICATION_M190_SET_HEATED_BED_TEMPERATURE
} from './constants';

const noop = () => {};

/**
 * @param {{
 *   show?: boolean,
 *   type?: string,
 *   data?: unknown,
 *   onDismiss?: () => void,
 * }} props Component props.
 */
function Notifications({
  show = true,
  type = '',
  data = null,
  onDismiss = noop,
  ...props
}) {
  if (!show) {
    return null;
  }

  return (
    <Box
      {...props}
      position="absolute"
      bottom={0}
      left={0}
      right={0}
    >
      <Toast
        {...props}
        appearance={{
          [NOTIFICATION_PROGRAM_ERROR]: 'error',
          [NOTIFICATION_M0_PROGRAM_PAUSE]: 'info',
          [NOTIFICATION_M1_PROGRAM_PAUSE]: 'info',
          [NOTIFICATION_M2_PROGRAM_END]: 'success',
          [NOTIFICATION_M30_PROGRAM_END]: 'success',
          [NOTIFICATION_M6_TOOL_CHANGE]: 'info',
          [NOTIFICATION_M109_SET_EXTRUDER_TEMPERATURE]: 'warning',
          [NOTIFICATION_M190_SET_HEATED_BED_TEMPERATURE]: 'warning'
        }[type]}
        isClosable
        onClose={onDismiss}
      >
        {type === NOTIFICATION_PROGRAM_ERROR && (
          <Box>
            <Box><Text as="strong">{i18n._('Error')}</Text></Box>
            {data && (
              <Box as="code">{data}</Box>
            )}
            <Box>{i18n._('Click the Resume button to resume program execution.')}</Box>
          </Box>
        )}
        {type === NOTIFICATION_M0_PROGRAM_PAUSE && (
          <Box>
            <Box><Text as="strong">{i18n._('M0 Program Pause')}</Text></Box>
            {data && (
              <Box as="code">{data}</Box>
            )}
            <Box>{i18n._('Click the Resume button to resume program execution.')}</Box>
          </Box>
        )}
        {type === NOTIFICATION_M1_PROGRAM_PAUSE && (
          <Box>
            <Box><Text as="strong">{i18n._('M1 Program Pause')}</Text></Box>
            {data && (
              <Box as="code">{data}</Box>
            )}
            <Box>{i18n._('Click the Resume button to resume program execution.')}</Box>
          </Box>
        )}
        {type === NOTIFICATION_M2_PROGRAM_END && (
          <Box>
            <Box><Text as="strong">{i18n._('M2 Program End')}</Text></Box>
            {data && (
              <Box as="code">{data}</Box>
            )}
            <Box>{i18n._('Click the Stop button to stop program execution.')}</Box>
          </Box>
        )}
        {type === NOTIFICATION_M30_PROGRAM_END && (
          <Box>
            <Box><Text as="strong">{i18n._('M30 Program End')}</Text></Box>
            {data && (
              <Box as="code">{data}</Box>
            )}
            <Box>{i18n._('Click the Stop button to stop program execution.')}</Box>
          </Box>
        )}
        {type === NOTIFICATION_M6_TOOL_CHANGE && (
          <Box>
            <Box><Text as="strong">{i18n._('M6 Tool Change')}</Text></Box>
            {data && (
              <Box as="code">{data}</Box>
            )}
            <Box>
              {i18n._('Run a tool change macro to change the tool and adjust the Z-axis offset. Afterwards, click the Resume button to resume program execution.')}
              <Space width="2x" />
              <Link
                target="_blank"
                href="https://github.com/cncjs/cncjs/wiki/Tool-Change"
              >
                {i18n._('Learn more')}
              </Link>
            </Box>
          </Box>
        )}
        {type === NOTIFICATION_M109_SET_EXTRUDER_TEMPERATURE && (
          <Box>
            <Box><Text as="strong">{i18n._('M109 Set Extruder Temperature')}</Text></Box>
            {data && (
              <Box as="code">{data}</Box>
            )}
            <Box>{i18n._('Waiting for the target temperature to be reached...')}</Box>
          </Box>
        )}
        {type === NOTIFICATION_M190_SET_HEATED_BED_TEMPERATURE && (
          <Box>
            <Box><Text as="strong">{i18n._('M190 Set Heated Bed Temperature')}</Text></Box>
            {data && (
              <Box as="code">{data}</Box>
            )}
            <Box>{i18n._('Waiting for the target temperature to be reached...')}</Box>
          </Box>
        )}
      </Toast>
    </Box>
  );
}

export default Notifications;
