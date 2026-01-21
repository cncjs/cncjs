import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import i18n from 'app/lib/i18n';
import {
  MODAL_PROBING_SETUP,
  MODAL_APPLY_AUTOLEVEL,
} from './constants';
import styles from './index.styl';

class AutoLevel extends PureComponent {
  static propTypes = {
    state: PropTypes.object,
    actions: PropTypes.object
  };

  render() {
    const { state, actions } = this.props;
    const { probingData, canClick } = state;

    const hasData = probingData && probingData.length > 0;

    // Calculate min/max Z for display
    let minZ = 0;
    let maxZ = 0;
    let deltaZ = 0;
    if (hasData) {
      const zValues = probingData.map(p => p.z);
      minZ = Math.min(...zValues);
      maxZ = Math.max(...zValues);
      deltaZ = maxZ - minZ;
    }

    return (
      <div>
        {hasData && (
          <div className={styles.probingInfo}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>{i18n._('Points')}:</span>
              <span className={styles.infoValue}>{probingData.length}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>{i18n._('Min Z')}:</span>
              <span className={styles.infoValue}>{minZ.toFixed(3)}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>{i18n._('Max Z')}:</span>
              <span className={styles.infoValue}>{maxZ.toFixed(3)}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>{i18n._('Delta Z')}:</span>
              <span className={styles.infoValue}>{deltaZ.toFixed(3)}</span>
            </div>
          </div>
        )}

        {hasData ? (
          <div className={styles.probingTable}>
            <div className={styles.tableContainer}>
              <table>
                <thead>
                  <tr>
                    <th>X</th>
                    <th>Y</th>
                    <th>Z</th>
                  </tr>
                </thead>
                <tbody>
                  {probingData.map((point, index) => (
                    <tr key={index}>
                      <td>{point.x.toFixed(3)}</td>
                      <td>{point.y.toFixed(3)}</td>
                      <td>{point.z.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className={styles.noData}>
            {i18n._('No probing data available')}
          </div>
        )}

        <div className={styles.buttonGroup}>
          <button
            type="button"
            className="btn btn-sm btn-default"
            onClick={() => actions.openModal(MODAL_PROBING_SETUP)}
            disabled={!canClick}
          >
            {i18n._('Setup')}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-default"
            onClick={actions.clearProbingData}
            disabled={!hasData}
          >
            {i18n._('Clear')}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-default"
            onClick={actions.saveProbingData}
            disabled={!hasData}
          >
            {i18n._('Save')}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => actions.openModal(MODAL_APPLY_AUTOLEVEL)}
            disabled={!hasData || !canClick}
          >
            {i18n._('Apply')}
          </button>
        </div>
      </div>
    );
  }
}

export default AutoLevel;
