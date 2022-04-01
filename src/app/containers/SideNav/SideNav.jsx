import classNames from 'classnames';
import React from 'react';
import { Link, withRouter } from 'react-router-dom';
import Image from 'app/components/Image';
import {
  SIDENAV_BACKGROUND_COLOR,
  SIDENAV_WIDTH,
} from 'app/config/styles';
import i18n from 'app/lib/i18n';
import styles from './index.styl';
import iconXYZ from './images/xyz.svg';
import iconGear from './images/gear.svg';

function SideNav({
  location,
}) {
  const { pathname = '' } = location;

  return (
    <ul
      className={styles.nav}
      style={{
        backgroundColor: SIDENAV_BACKGROUND_COLOR,
        width: SIDENAV_WIDTH,
      }}
    >
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
          { [styles.active]: pathname.indexOf('/administration') === 0 }
        )}
      >
        <Link to="/administration" title={i18n._('Administration')}>
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
}

export default withRouter(SideNav);
