import PropTypes from 'prop-types';
import React from 'react';
import i18n from 'app/lib/i18n';
import styles from './LoadProbeView.styl';

const LoadProbeView = ({ state, actions }) => {
  const { probeFileName, probeStats } = state;
  const hasProbeData = probeStats && probeStats.points > 0;

  return (
    <div className={styles.loadProbeView}>
      <div className={styles.sectionHeader}>
        <button
          type="button"
          onClick={actions.backToLanding}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            font: 'inherit',
            cursor: 'pointer',
            marginRight: '8px'
          }}
        >
          <i className="fa fa-chevron-left" />
        </button>
        {i18n._('Load Probe Data')}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>{i18n._('Probe Data')}</div>

        {probeFileName && (
          <div className={styles.fileInfo}>
            <span role="img" aria-label="File">📂</span> {i18n._('File')}: {probeFileName}
          </div>
        )}

        {hasProbeData ? (
          <div className={styles.probeDataInfo}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>{i18n._('Points')}:</span>
              <span className={styles.infoValue}>{probeStats.points}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>{i18n._('Z-Range')}:</span>
              <span className={styles.infoValue}>
                {probeStats.minZ.toFixed(3)} ~ {probeStats.maxZ.toFixed(3)} mm
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>{i18n._('Max Deviation')}:</span>
              <span className={styles.infoValue}>{probeStats.maxDeviation.toFixed(3)} mm</span>
            </div>
          </div>
        ) : (
          <div className={styles.noData}>
            {i18n._('No valid probe data loaded')}
          </div>
        )}

        <button
          type="button"
          className="btn btn-sm btn-default btn-block"
          onClick={actions.loadProbeFile}
          style={{ marginTop: 10 }}
        >
          {hasProbeData ? i18n._('Load Different Probe File') : i18n._('Load Probe File')}
        </button>
      </div>

      {hasProbeData && (
        <div style={{ marginTop: '10px' }}>
          <button
            type="button"
            className="btn btn-sm btn-primary btn-block"
            onClick={actions.goToApply}
          >
            {i18n._('Continue to Apply')} →
          </button>
        </div>
      )}
    </div>
  );
};

LoadProbeView.propTypes = {
  state: PropTypes.object.isRequired,
  actions: PropTypes.object.isRequired,
};

export default LoadProbeView;
