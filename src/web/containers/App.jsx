import classNames from 'classnames';
import React, { Component } from 'react';
import user from '../lib/user';
import Login from './Login';
import Header from './Header';
import Sidebar from './Sidebar';
import Workspace from './Workspace';
import Settings from './Settings';
import styles from './App.styl';

const defaultPath = 'workspace';

class App extends Component {
    render() {
        const { children } = this.props;
        const { path = defaultPath } = children.props.route;
        const childPath = children.props.routes.slice(2).map(route => route.path).join('/');

        if (!user.authenticated()) {
            return (
                <Login {...this.props} />
            );
        }

        return (
            <div>
                <Header path={path} />
                <aside className={styles.sidebar} id="sidebar">
                    <Sidebar path={path} />
                </aside>
                <div className={styles.main}>
                    <div className={styles.content}>
                        <Workspace
                            className={classNames(
                                { 'hidden': path !== 'workspace' }
                            )}
                        />
                        {path === 'settings' &&
                            <Settings path={childPath} />
                        }
                    </div>
                </div>
            </div>
        );
    }
}

export default App;
