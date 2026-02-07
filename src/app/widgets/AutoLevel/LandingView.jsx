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
          {i18n._('Configure probe region and run auto-leveling on your PCB to create new probe data.')}
        </div>
        <Button
          btnStyle="flat"
          btnSize="md"
          onClick={actions.startNewProbe}
        >
          {i18n._('Start New Probe')}
        </Button>
      </div>

      <div className={styles.pathCard}>
        <div className={styles.pathTitle}>
          <span role="img" aria-label="Wrench" style={{ fontSize: 22 }}>🔧</span>
          {i18n._('APPLY AUTO-LEVEL')}
        </div>
        <div className={styles.pathDescription}>
          {i18n._('Load a previously saved .probe file and apply it directly to your G-code.')}
        </div>
        <Button
          btnStyle="flat"
          btnSize="md"
          onClick={actions.loadProbeFile}
        >
          {i18n._('Load Probe Data')}
        </Button>
      </div>

      <div className={styles.landingTip}>
        <div className={styles.tipIcon}>
          <span role="img" aria-label="Light bulb">💡</span>
        </div>
        <div className={styles.tipText}>
          {i18n._('Tip: Save probe data after probing to reuse it for multiple jobs on the same PCB fixture.')}
        </div>
      </div>
    </div>
  );
};

LandingView.propTypes = {
  actions: PropTypes.object.isRequired,
};

export default LandingView;
