import {
  Box,
} from '@tonic-ui/react';
import {
  useMediaQuery,
  useToggle,
} from '@tonic-ui/react-hooks';
import { ensureArray } from 'ensure-type';
import React, { forwardRef, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import layout from 'app/config/layout';
import { routes } from 'app/config/routes';
import Header from 'app/containers/Header';
import Main from 'app/containers/Main';
import { MiniNav, SideNav } from 'app/containers/Nav';
import analytics from 'app/lib/analytics';
import log from 'app/lib/log';
import * as user from 'app/lib/user';
import About from 'app/pages/About';
import Administration from 'app/pages/Administration';
import Workspace from 'app/pages/Workspace';

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

  /**
   * The acceptedPaths is an array of the route paths.
   *
   * /workspace
   * /about
   * /administration/:xxx
   */
  const acceptedPaths = ((routes) => {
    const stack = [...routes];
    const paths = [];
    while (stack.length > 0) {
      const current = stack.pop();
      paths.push(current.path);
      let index = 0;
      while (index < ensureArray(current.routes).length) {
        stack.push(current.routes[index]);
        ++index;
      }
    }
    return paths;
  })(routes);

  const defaultPath = '/workspace';
  const isAcceptedPath = acceptedPaths.includes(location.pathname);
  if (!isAcceptedPath) {
    return (
      <Navigate
        to={{
          pathname: defaultPath,
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
        {(location.pathname.indexOf('/about') === 0) && (
          <Box height={`calc(100vh - ${layout.header.height}px)`}>
            <About />
          </Box>
        )}
        {(location.pathname.indexOf('/administration') === 0) && (
          <Box height={`calc(100vh - ${layout.header.height}px)`}>
            <Administration />
          </Box>
        )}
        <Workspace
          style={{
            display: (location.pathname !== '/workspace') ? 'none' : 'block'
          }}
        />
      </Main>
    </Box>
  );
});

export default ProtectedPage;
