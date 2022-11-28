import {
  Box,
} from '@tonic-ui/react';
import {
  useMediaQuery,
  useToggle,
} from '@tonic-ui/react-hooks';
import React, { forwardRef, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import layout from 'app/config/layout';
import Administration from 'app/containers/Administration';
import Header from 'app/containers/Header';
import Main from 'app/containers/Main';
import { MiniNav, SideNav } from 'app/containers/Nav';
import Workspace from 'app/containers/Workspace';
import analytics from 'app/lib/analytics';
import log from 'app/lib/log';
import * as user from 'app/lib/user';

const ProtectedPage = forwardRef((props, ref) => {
  const notLessThan640 = useMediaQuery('(min-width: 640px)'); // md
  const notLessThan1024 = useMediaQuery('(min-width: 1024px)'); // lg
  const [isMiniNavExpanded, toggleMiniNavExpanded] = useToggle(false);
  const [isSideNavOpen, toggleSideNav] = useToggle(false);
  const location = useLocation();

  useEffect(() => {
    analytics.pageview(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    if (notLessThan1024 && isSideNavOpen) {
      toggleSideNav(false);
    }
  }, [notLessThan1024, isSideNavOpen, toggleSideNav]);

  if (!user.isAuthenticated()) {
    const redirectFrom = location.pathname;
    const redirectTo = '/login';

    log.debug(`Redirect from "${redirectFrom}" to "${redirectTo}"`);

    return (
      <Navigate
        to={{
          pathname: '/login',
          state: {
            from: location
          }
        }}
      />
    );
  }

  const accepted = ([
    '/workspace',
    '/administration',
    '/administration/general',
    '/administration/workspace',
    '/administration/machine-profiles',
    '/administration/user-accounts',
    '/administration/controller',
    '/administration/commands',
    '/administration/events',
    '/administration/about'
  ].indexOf(location.pathname) >= 0);

  if (!accepted) {
    return (
      <Navigate
        to={{
          pathname: '/workspace',
          state: {
            from: location,
          }
        }}
      />
    );
  }

  return (
    <Box
      ref={ref}
      {...props}
    >
      {!notLessThan1024 && (
        <SideNav
          isOpen={isSideNavOpen}
          onClose={() => toggleSideNav(false)}
        />
      )}
      <Header
        onToggle={() => {
          if (notLessThan1024) {
            toggleMiniNavExpanded();
          } else {
            toggleSideNav();
          }
        }}
        position="fixed"
        top={0}
        left={0}
        right={0}
        height={layout.header.height}
        zIndex="fixed"
      />
      {notLessThan640 && (
        <MiniNav
          isExpanded={notLessThan1024 ? isMiniNavExpanded : false}
          position="fixed"
          top={layout.header.height}
          bottom={0}
          left={0}
          width={{
            xs: 0,
            md: layout.mininav.defaultWidth,
            lg: (isMiniNavExpanded) ? layout.mininav.expandedWidth : layout.mininav.defaultWidth,
          }}
          zIndex="fixed"
        />
      )}
      <Main
        ml={{
          xs: 0,
          md: layout.mininav.defaultWidth,
          lg: (isMiniNavExpanded) ? layout.mininav.expandedWidth : layout.mininav.defaultWidth,
        }}
        pt={layout.header.height}
      >
        <Workspace
          style={{
            display: (location.pathname !== '/workspace') ? 'none' : 'block'
          }}
        />
        {(location.pathname.indexOf('/administration') === 0) && (
          <Administration />
        )}
      </Main>
    </Box>
  );
});

export default ProtectedPage;
