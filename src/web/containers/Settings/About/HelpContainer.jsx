import React from 'react';
import i18n from '../../../lib/i18n';
import styles from './index.styl';

const HelpContainer = () => {
    return (
        <div className={styles.helpContainer}>
            <button
                type="button"
                className="btn btn-default"
                onClick={() => {
                    const url = 'https://github.com/cheton/cnc/issues';
                    window.open(url, '_blank');
                }}
            >
                {i18n._('Report an issue')}
            </button>
        </div>
    );
};

export default HelpContainer;

