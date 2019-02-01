import classNames from 'classnames';
import React from 'react';
import { Link, withRouter } from 'react-router-dom';
import Image from 'app/components/Image';
import i18n from 'app/lib/i18n';
import styles from './index.styl';
import iconXYZ from './images/xyz.svg';
import iconGear from './images/gear.svg';

const Sidebar = ({
    location,
}) => {
    const { pathname = '' } = location;

    return (
        <ul className={styles.nav}>
            <li
                className={classNames(
                    'text-center',
                    { [styles.active]: pathname.indexOf('/workspace') === 0 }
                )}
            >
                <Link to="/workspace" title={i18n._('Workspace')}>
                    <Image
                        className={styles.invert}
                        src={iconXYZ}
                        style={{
                            alignSelf: 'center',
                            height: 32,
                            width: '100%',
                        }}
                    />
                </Link>
            </li>
            <li
                className={classNames(
                    'text-center',
                    { [styles.active]: pathname.indexOf('/settings') === 0 }
                )}
            >
                <Link to="/settings" title={i18n._('Settings')}>
                    <Image
                        className={styles.invert}
                        src={iconGear}
                        style={{
                            alignSelf: 'center',
                            height: 32,
                            width: '100%',
                        }}
                    />
                </Link>
            </li>
        </ul>
    );
};

export default withRouter(Sidebar);
