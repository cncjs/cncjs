import React, { PropTypes } from 'react';
import Anchor from '../../../components/Anchor';
import settings from '../../../config/settings';
import i18n from '../../../lib/i18n';
import styles from './index.styl';

const AboutContainer = ({ version }) => {
    const wiki = 'https://github.com/cncjs/cncjs/wiki';

    return (
        <div className={styles.aboutContainer}>
            <img src="logo.png" alt="" className={styles.productLogo} />
            <div className={styles.productDetails}>
                <div className={styles.aboutProductName}>
                    {`${settings.name} ${version.current}`}
                </div>
                <div className={styles.aboutProductDescription}>
                    {i18n._('A web-based interface for CNC milling controller running Grbl, Smoothieware, or TinyG')}
                </div>
                <Anchor
                    className={styles.learnmore}
                    href={wiki}
                    target="_blank"
                >
                    {i18n._('Learn more')}
                    <i className="fa fa-arrow-circle-right" style={{ marginLeft: 5 }} />
                </Anchor>
            </div>
        </div>
    );
};

AboutContainer.propTypes = {
    title: PropTypes.string
};

export default AboutContainer;

