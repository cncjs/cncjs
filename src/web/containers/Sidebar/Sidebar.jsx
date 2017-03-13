import classNames from 'classnames';
import React, { Component } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import { Link, withRouter } from 'react-router-dom';
import i18n from '../../lib/i18n';
import styles from './index.styl';

class Sidebar extends Component {
    static propTypes = {
        ...withRouter.propTypes
    };

    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
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
                            { [styles.active]: pathname.indexOf('/settings') === 0 }
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

export default withRouter(Sidebar);
