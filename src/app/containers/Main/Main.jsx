import React, { Fragment } from 'react';
import { Redirect, withRouter } from 'react-router-dom';
import compose from 'recompose/compose';
import Header from 'app/containers/Header';
import Settings from 'app/containers/Settings';
import Sidebar from 'app/containers/Sidebar';
import Workspace from 'app/containers/Workspace';
import { trackPage } from 'app/lib/analytics';
import styles from './index.styl';

const Main = ({
    match,
    location,
    history
}) => {
    const accepted = ([
        '/workspace',
        '/settings',
        '/settings/general',
        '/settings/workspace',
        '/settings/account',
        '/settings/controller',
        '/settings/commands',
        '/settings/events',
        '/settings/about'
    ].indexOf(location.pathname) >= 0);

    if (!accepted) {
        return (
            <Redirect
                to={{
                    pathname: '/workspace',
                    state: {
                        from: location
                    }
                }}
            />
        );
    }

    trackPage(location.pathname);

    return (
        <Fragment>
            <Header />
            <aside className={styles.sidebar} id="sidebar">
                <Sidebar />
            </aside>
            <div className={styles.main}>
                <div className={styles.content}>
                    <Workspace
                        style={{
                            display: (location.pathname !== '/workspace') ? 'none' : 'block'
                        }}
                    />

                    {location.pathname.indexOf('/settings') === 0 &&
                        <Settings />
                    }
                </div>
            </div>
        </Fragment>
    );
};

export default compose(
    withRouter
)(Main);
