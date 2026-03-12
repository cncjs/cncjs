import PropTypes from 'prop-types';
import React from 'react';
import { Button } from 'app/components/Buttons';
import i18n from 'app/lib/i18n';
import styles from './LandingView.styl';

const LandingView = ({ actions }) => {
  return (
    <div className={styles.landingView}>
      <div className={styles.pathCard}>

        <div className={styles.pathTitle}>
          <span role="img" aria-label="Target" style={{ fontSize: 22 }}>🎯</span>
          {i18n._('PROBE NEW SURFACE')}
        </div>
        <div className={styles.pathDescription}>
          {i18n._('Set up the probe area and probe the work surface to generate height compensation data.')}
        </div>
        <Button
          btnStyle="flat"
          onClick={actions.startNewProbe}
        >
          {i18n._('Start New Probe')}
        </Button>
      </div>

      <div className={styles.pathCard}>
        <div className={styles.pathTitle}>
          <span role="img" aria-label="Wrench" style={{ fontSize: 22 }}>🔧</span>
          {i18n._('APPLY COMPENSATION')}
        </div>
        <div className={styles.pathDescription}>
          {i18n._('Load a previously saved .probe file and apply it to your G-code.')}
        </div>
        <Button
          btnStyle="flat"
          onClick={actions.loadProbeFile}
        >
          {i18n._('Load Probe Data')}
        </Button>
      </div>

    </div>
  );
};

LandingView.propTypes = {
  actions: PropTypes.object.isRequired,
};

export default LandingView;
