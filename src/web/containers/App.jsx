import classNames from 'classnames';
import React, { PropTypes } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import Workspace from './Workspace';
import Settings from './Settings';
import styles from './App.styl';

const App = (props) => {
    const defaultPath = 'workspace';
    const { children } = props;
    const { path = defaultPath } = children.props.route;

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
                        <Settings />
                    }
                </div>
            </div>
        </div>
    );
};

App.propTypes = {
    children: PropTypes.node
};

export default App;
