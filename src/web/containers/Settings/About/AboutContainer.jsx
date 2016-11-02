import React from 'react';
import styles from './index.styl';

const AboutContainer = ({ title }) => {
    return (
        <div className={styles.aboutContainer}>
            <img src="logo.png" alt="" className={styles.productLogo} />
            <div className={styles.productDescription}>
                <div className={styles.aboutProductTitle}>{title}</div>
                <span className={styles.aboutProductDescription}>
                    A web-based interface for CNC milling controller running Grbl or TinyG2
                </span>
            </div>
        </div>
    );
};

export default AboutContainer;

