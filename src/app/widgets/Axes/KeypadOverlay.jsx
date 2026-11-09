import { faLongArrowAltDown, faLongArrowAltUp } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { AngleDownIcon, AngleLeftIcon, AngleRightIcon, AngleUpIcon } from '@tonic-ui/react-icons';
import {
  Box,
  Space,
  Tooltip,
} from '@tonic-ui/react';
import React from 'react';
import i18n from '@app/lib/i18n';

const keypadInfotip = () => {
  const styles = {
    container: {
      fontFamily: 'Consolas, Menlo, Monaco, Lucida Console, Liberation Mono, DejaVu Sans Mono, Bitstream Vera Sans Mono, Courier New, monospace, serif',
      textAlign: 'left',
    },
    axisDirection: {
      display: 'inline-block',
      marginRight: 10
    },
    divider: {
      borderTop: '1px solid',
      borderColor: 'border.secondary',
      marginTop: 5,
      paddingTop: 5
    },
    kbd: {
      border: '1px solid',
      borderColor: 'border.secondary',
      padding: '1px 4px',
      fontFamily: 'sans-serif',
      whiteSpace: 'nowrap'
    },
    icon: {
      minWidth: 10,
      textAlign: 'center'
    }
  };

  return (
    <Box style={styles.container}>
      <Box style={{ textAlign: 'left' }}>
        <Box>
          <Box sx={styles.axisDirection}>X+</Box>
          <kbd style={styles.kbd}>
            <AngleRightIcon aria-hidden="true" size="1em" style={styles.icon} />
          </kbd>
          <Space width="2x" />
          {i18n._('Right')}
        </Box>
        <Box>
          <Box sx={styles.axisDirection}>X-</Box>
          <kbd style={styles.kbd}>
            <AngleLeftIcon aria-hidden="true" size="1em" style={styles.icon} />
          </kbd>
          <Space width="2x" />
          {i18n._('Left')}
        </Box>
        <Box>
          <Box sx={styles.axisDirection}>Y+</Box>
          <kbd style={styles.kbd}>
            <AngleUpIcon aria-hidden="true" size="1em" style={styles.icon} />
          </kbd>
          <Space width="2x" />
          {i18n._('Up')}
        </Box>
        <Box>
          <Box sx={styles.axisDirection}>Y-</Box>
          <kbd style={styles.kbd}>
            <AngleDownIcon aria-hidden="true" size="1em" style={styles.icon} />
          </kbd>
          <Space width="2x" />
          {i18n._('Down')}
        </Box>
        <Box>
          <Box sx={styles.axisDirection}>Z+</Box>
          <kbd style={styles.kbd}>
            <FontAwesomeIcon aria-hidden="true" icon={faLongArrowAltUp} style={styles.icon} />
          </kbd>
          <Space width="2x" />
          {i18n._('Page Up')}
        </Box>
        <Box>
          <Box sx={styles.axisDirection}>Z-</Box>
          <kbd style={styles.kbd}>
            <FontAwesomeIcon aria-hidden="true" icon={faLongArrowAltDown} style={styles.icon} />
          </kbd>
          <Space width="2x" />
          {i18n._('Page Down')}
        </Box>
        <Box>
          <Box sx={styles.axisDirection}>A+</Box>
          <kbd style={styles.kbd}>
            {' ] '}
          </kbd>
          <Space width="2x" />
          {i18n._('Right Square Bracket')}
        </Box>
        <Box>
          <Box sx={styles.axisDirection}>A-</Box>
          <kbd style={styles.kbd}>
            {' [ '}
          </kbd>
          <Space width="2x" />
          {i18n._('Left Square Bracket')}
        </Box>
      </Box>
      <Box>
        <Box style={styles.divider} />
      </Box>
      <Box>
        <Box>
          <Box className="table-form">
            <Box className="table-form-row table-form-row-dense">
              <Box className="table-form-col table-form-col-label">{i18n._('0.1x Move')}</Box>
              <Box className="table-form-col">
                <kbd style={styles.kbd}>{i18n._('Alt')}</kbd>
              </Box>
            </Box>
            <Box className="table-form-row table-form-row-dense">
              <Box className="table-form-col table-form-col-label">{i18n._('10x Move')}</Box>
              <Box className="table-form-col">
                <kbd style={styles.kbd}>{i18n._('⇧ Shift')}</kbd>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

/**
 * @param {{ show?: boolean, children?: React.ReactNode }} props
 * @returns {JSX.Element|React.ReactNode}
 */
function KeypadOverlay({ show = false, children }) {
  if (!show) {
    return children;
  }

  return (
    <Tooltip
      closeOnClick
      enterDelay={0}
      label={keypadInfotip()}
      p={0}
      placement="bottom"
    >
      {children}
    </Tooltip>
  );
}

export default KeypadOverlay;
