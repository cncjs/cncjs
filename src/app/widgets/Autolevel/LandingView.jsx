import { Box, Button, Text } from '@tonic-ui/react';
import React from 'react';
import i18n from '@app/lib/i18n';
import styles from './LandingView.styl';

/**
 * @param {{onStartNewProbe?: Function, onLoadProbeFile?: Function}} props
 */
function LandingView({ onStartNewProbe = () => {}, onLoadProbeFile = () => {} }) {
  const pathCardStyle = {
    backgroundColor: 'background.medium',
    border: '1px solid',
    borderColor: 'border.secondary',
    '&:hover': { backgroundColor: 'actions.hovered' },
  };

  return (
    <Box className={styles.landingView}>
      <Box className={styles.pathCard} sx={pathCardStyle}>
        <Box
          alignItems="center" className={styles.pathTitle} display="flex"
          gap="1x"
          color="text.primary"
        >
          <span aria-label={i18n._('Target')} role="img" style={{ fontSize: 22 }}>🎯</span>
          {i18n._('PROBE NEW SURFACE')}
        </Box>
        <Text className={styles.pathDescription} color="text.secondary">
          {i18n._('Set up the probe area and probe the work surface to generate height compensation data.')}
        </Text>
        <Button onClick={onStartNewProbe} variant="secondary">
          {i18n._('Start New Probe')}
        </Button>
      </Box>
      <Box className={styles.pathCard} sx={pathCardStyle}>
        <Box
          alignItems="center" className={styles.pathTitle} display="flex"
          gap="1x"
          color="text.primary"
        >
          <span aria-label={i18n._('Wrench')} role="img" style={{ fontSize: 22 }}>🔧</span>
          {i18n._('APPLY COMPENSATION')}
        </Box>
        <Text className={styles.pathDescription} color="text.secondary">
          {i18n._('Load a previously saved .probe file and apply it to your G-code.')}
        </Text>
        <Button onClick={onLoadProbeFile} variant="secondary">
          {i18n._('Load Probe Data')}
        </Button>
      </Box>
    </Box>
  );
}

export default LandingView;
