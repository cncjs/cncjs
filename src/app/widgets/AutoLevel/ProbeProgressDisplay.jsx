import PropTypes from 'prop-types';
import React from 'react';
import i18n from 'app/lib/i18n';
import styles from './ProbeProgressDisplay.styl';

const ProbeProgressDisplay = ({ progress }) => {
  const { current, total, percentage } = progress;

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>{i18n._('Probing Progress')}</div>
      <div className={styles.progressContainer}>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${percentage}%` }} />
        </div>
        <div className={styles.progressText}>
          {current}/{total} {i18n._('points')} ({percentage}%)
        </div>
      </div>
    </div>
  );
};

ProbeProgressDisplay.propTypes = {
  progress: PropTypes.shape({
    current: PropTypes.number.isRequired,
    total: PropTypes.number.isRequired,
    percentage: PropTypes.number.isRequired,
  }).isRequired,
};

export default ProbeProgressDisplay;
