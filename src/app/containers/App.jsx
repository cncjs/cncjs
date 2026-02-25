import React, { PureComponent } from 'react';
import { Redirect, withRouter } from 'react-router-dom';
import i18n from '../lib/i18n';
import store from '../store';
import { trackPage } from '../lib/analytics';
import Header from './Header';
import Sidebar from './Sidebar';
import Workspace from './Workspace';
import Settings from './Settings';
import styles from './App.styl';

class App extends PureComponent {
    static propTypes = {
      ...withRouter.propTypes
    };

    componentDidMount() {
      this.updateAccessibilityStyles();
      store.on('change', this.updateAccessibilityStyles);
    }

    componentWillUnmount() {
      store.removeListener('change', this.updateAccessibilityStyles);
    }

    updateAccessibilityStyles = () => {
      const focusIndicators = store.get('accessibility.focusIndicators');
      if (focusIndicators) {
        document.body.classList.add('a11y-focus');
      } else {
        document.body.classList.remove('a11y-focus');
      }
    };

    render() {
      const { location } = this.props;
      const accepted = ([
        '/workspace',
        '/settings',
        '/settings/general',
        '/settings/workspace',
        '/settings/machine-profiles',
        '/settings/user-accounts',
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
        <div>
          <a href="#main-content" className={styles.skipLink}>
            {i18n._('Skip to main content')}
          </a>
          <div role="banner">
            <Header {...this.props} />
          </div>
          <aside className={styles.sidebar} id="sidebar">
            <Sidebar {...this.props} />
          </aside>
          <div className={styles.main} role="main" id="main-content">
            <div className={styles.content}>
              <Workspace
                {...this.props}
                style={{
                  display: (location.pathname !== '/workspace') ? 'none' : 'block'
                }}
              />
              {location.pathname.indexOf('/settings') === 0 &&
                <Settings {...this.props} />}
            </div>
          </div>
        </div>
      );
    }
}

export default withRouter(App);
