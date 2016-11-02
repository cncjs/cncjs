import moment from 'moment';
import classNames from 'classnames';
import React, { PropTypes } from 'react';
import semver from 'semver';
import i18n from '../../../lib/i18n';
import styles from './index.styl';

const UpdateStatusContainer = (props) => {
    const { checking, current, latest, lastUpdate } = props;
    const newUpdateAvailable = (checking === false) && semver.lt(current, latest);

    if (checking) {
        return (
            <div className={styles.updateStatusContainer}>
                <div className={styles.updateStatusIcon}>
                    <i className="fa fa-circle-o-notch fa-fw fa-spin" />
                </div>
                <div className={styles.updateStatusMessageContainer}>
                    <div className={styles.updateStatusMessage}>
                        {i18n._('Checking for updates...')}
                    </div>
                </div>
            </div>
        );
    }

    if (newUpdateAvailable) {
        return (
            <div className={styles.updateStatusContainer}>
                <div className={classNames(styles.updateStatusIcon, styles.warning)}>
                    <i className="fa fa-exclamation-circle fa-fw" />
                </div>
                <div className={styles.updateStatusMessageContainer}>
                    <div className={styles.updateStatusMessage}>
                        {i18n._('New update available')}
                    </div>
                    <div className={styles.releaseLatest}>
                        {i18n._('Version {{version}}', { version: latest })}
                        <br />
                        {moment(lastUpdate).format('L')}
                    </div>
                </div>
                <div className={styles.updateStatusActionContainer}>
                    <button
                        type="btn"
                        className="btn btn-default btn-sm"
                        onClick={() => {
                            const url = 'https://github.com/cheton/cnc/releases/latest';
                            window.open(url, '_blank');
                        }}
                    >
                        <i className="fa fa-external-link fa-fw" />
                        &nbsp;
                        {i18n._('Latest release')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.updateStatusContainer}>
            <div className={classNames(styles.updateStatusIcon, styles.info)}>
                <i className="fa fa-check-circle fa-fw" />
            </div>
            <div className={styles.updateStatusMessageContainer}>
                <div className={styles.updateStatusMessage}>
                    {i18n._('cnc is up to date')}
                </div>
            </div>
        </div>
    );
};

UpdateStatusContainer.propTypes = {
    checking: PropTypes.bool,
    current: PropTypes.string,
    latest: PropTypes.string,
    lastUpdate: PropTypes.string
};

export default UpdateStatusContainer;
