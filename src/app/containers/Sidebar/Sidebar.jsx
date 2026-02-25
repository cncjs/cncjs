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
    const isWorkspace = pathname.indexOf('/workspace') === 0;
    const isSettings = pathname.indexOf('/settings') === 0;

    return (
      <nav className={styles.navbar} aria-label={i18n._('Main sidebar')}>
        <ul className={styles.nav}>
          <li
            className={classNames(
              'text-center',
              { [styles.active]: isWorkspace }
            )}
          >
            <Link
              to="/workspace"
              title={i18n._('Workspace')}
              aria-label={i18n._('Workspace')}
              aria-current={isWorkspace ? 'page' : undefined}
            >
              <i
                className={classNames(
                  styles.icon,
                  styles.iconInvert,
                  styles.iconXyz
                )}
                aria-hidden="true"
              />
            </Link>
          </li>
          <li
            className={classNames(
              'text-center',
              { [styles.active]: isSettings }
            )}
          >
            <Link
              to="/settings"
              title={i18n._('Settings')}
              aria-label={i18n._('Settings')}
              aria-current={isSettings ? 'page' : undefined}
            >
              <i
                className={classNames(
                  styles.icon,
                  styles.iconInvert,
                  styles.iconGear
                )}
                aria-hidden="true"
              />
            </Link>
          </li>
        </ul>
      </nav>
    );
  }
}

export default withRouter(Sidebar);
