import classNames from 'classnames';
import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import { Link } from 'react-router';
import i18n from '../../lib/i18n';
import styles from './index.styl';

class Sidebar extends Component {
    static propTypes = {
        path: PropTypes.string
    };

    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
    render() {
        const { path, ...props } = this.props;

        return (
            <nav {...props} className={styles.navbar}>
                <ul className={styles.nav}>
                    <li
                        className={classNames(
                            'text-center',
                            { [styles.active]: path === 'workspace' }
                        )}
                    >
                        <Link to="/workspace" title={i18n._('Workspace')}>
                            <i className="fa fa-desktop fa-2x" />
                            <span
                                style={{
                                    position: 'absolute',
                                    left: '50%',
                                    top: '41%',
                                    transform: 'translate(-50%, -50%)',
                                    fontSize: '70%'
                                }}
                            >XYZ</span>
                        </Link>
                    </li>
                    <li
                        className={classNames(
                            'text-center',
                            { [styles.active]: path === 'settings' }
                        )}
                    >
                        <Link to="/settings" title={i18n._('Settings')}>
                            <i className="fa fa-cogs fa-2x" />
                        </Link>
                    </li>
                </ul>
            </nav>
        );
    }
}

export default Sidebar;
