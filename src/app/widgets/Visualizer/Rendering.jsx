import React from 'react';
import i18n from 'app/lib/i18n';
import styles from './loader.styl';

export default () => (
    <div className={styles.loader}>
        <div className={styles.loaderIcon}>
            <i className="fa fa-cube fa-spin" />
        </div>
        <div className={styles.loaderText}>
            {i18n._('3D rendering')}
        </div>
    </div>
);
