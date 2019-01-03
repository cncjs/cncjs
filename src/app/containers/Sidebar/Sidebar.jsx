import classNames from 'classnames';
import React, { PureComponent } from 'react';
import { Link, withRouter } from 'react-router-dom';
import i18n from 'app/lib/i18n';
import styles from './index.styl';

class Sidebar extends PureComponent {
    static propTypes = {
        ...withRouter.propTypes
    };

    render() {
        const { pathname = '' } = this.props.location;

        return (
            <nav className={styles.navbar}>
                <ul className={styles.nav}>
                    <li
                        className={classNames(
                            'text-center',
                            { [styles.active]: pathname.indexOf('/workspace') === 0 }
                        )}
                    >
                        <Link to="/workspace" title={i18n._('Workspace')}>
                            <i
                                className={classNames(
                                    styles.icon,
                                    styles.iconInvert,
                                    styles.iconXyz
                                )}
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
                            <i
                                className={classNames(
                                    styles.icon,
                                    styles.iconInvert,
                                    styles.iconGear
                                )}
                            />
                        </Link>
                    </li>
                </ul>
            </nav>
        );
    }
}

export default withRouter(Sidebar);
