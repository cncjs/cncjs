import moment from 'moment';
import classNames from 'classnames';
import React, { PropTypes } from 'react';
import semver from 'semver';
import Anchor from '../../../components/Anchor';
import settings from '../../../config/settings';
import i18n from '../../../lib/i18n';
import styles from './index.styl';

const UpdateStatusContainer = (props) => {
    const { checking, current, latest, lastUpdate } = props;
    const newUpdateAvailable = (checking === false) && semver.lt(current, latest);

    if (checking) {
        return (
            <div className={styles.updateStatusContainer}>
                <div className={styles.updateStatusIcon}>
                    <i className="fa fa-fw fa-spin fa-circle-o-notch" />
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
                        {i18n._('A new version of {{name}} is available', { name: settings.name })}
                    </div>
                    <div className={styles.releaseLatest}>
                        {i18n._('Version {{version}}', { version: latest })}
                        <br />
                        {moment(lastUpdate).format('L')}
                    </div>
                </div>
                <div className={styles.updateStatusActionContainer}>
                    <Anchor
                        href="https://github.com/cncjs/cncjs/releases"
                        target="_blank"
                    >
                        <span className={styles.label}>
                            {i18n._('Latest version')}
                            <span className="space" />
                            <i className="fa fa-external-link fa-fw" />
                        </span>
                    </Anchor>
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
                    {i18n._('You already have the newest version of {{name}}', { name: settings.name })}
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
