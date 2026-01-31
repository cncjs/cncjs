import PropTypes from 'prop-types';
import React from 'react';
import i18n from 'app/lib/i18n';
import styles from './LandingView.styl';

const LandingView = ({ actions }) => {
  return (
    <div className={styles.landingView}>
      <div className={styles.landingPrompt}>
        {i18n._('Choose how to proceed:')}
      </div>

      <div className={styles.pathCard}>
        <div className={styles.pathIcon}>
          <span role="img" aria-label="Target">🎯</span>
        </div>
        <div className={styles.pathTitle}>
          {i18n._('PROBE NEW SURFACE')}
        </div>
        <div className={styles.pathDescription}>
          {i18n._('Configure probe region and run auto-leveling on your PCB to create new probe data.')}
        </div>
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={actions.startNewProbe}
        >
          {i18n._('Start Setup')} →
        </button>
      </div>

      <div className={styles.pathCard}>
        <div className={styles.pathIcon}>
          <span role="img" aria-label="Folder">📂</span>
        </div>
        <div className={styles.pathTitle}>
          {i18n._('LOAD EXISTING PROBE DATA')}
        </div>
        <div className={styles.pathDescription}>
          {i18n._('Load a previously saved .probe file and apply it directly to your G-code.')}
        </div>
        <button
          type="button"
          className="btn btn-default btn-block"
          onClick={actions.loadProbeFile}
        >
          {i18n._('Load .probe File')}
        </button>
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
