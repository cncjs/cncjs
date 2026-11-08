import {
  Box,
  useTheme,
} from '@tonic-ui/react';
import {
  useConst,
  useMediaQuery,
  useToggle,
} from '@tonic-ui/react-hooks';
import { ensureArray } from 'ensure-type';
import React, { forwardRef, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import layout from '@app/config/layout';
import { routes } from '@app/config/routes';
import * as analytics from '@app/lib/analytics';
import x from '@app/lib/json-stringify';
import log from '@app/lib/log';
import * as user from '@app/lib/user';
import About from '@app/pages/About';
import * as Administration from '@app/pages/Administration';
import Workspace from '@app/pages/Workspace';
import Header from './Header';
import MiniNav from './MiniNav';
import SideNav from './SideNav';

const MainPage = forwardRef((props, ref) => {
  const theme = useTheme();
  const notLessThanMd = useMediaQuery(`(min-width: ${theme.breakpoints.md})`); // v3: 744px
  const notLessThanLg = useMediaQuery(`(min-width: ${theme.breakpoints.lg})`); // v3: 1440px
  const [isMiniNavExpanded, toggleMiniNavExpanded] = useToggle(false);
  const [isSideNavOpen, toggleSideNav] = useToggle(false);
  const location = useLocation();
  const defaultPath = '/workspace';
  const acceptedPaths = useConst(() => {
    /**
     * The accepted paths are the paths that are allowed to be navigated to. It includes the following:
     * /about
     * /administration/:name
     * /workspace
     */
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
  });

  useEffect(() => {
    const page = location.pathname;
    analytics.pageview({ page });
  }, [location.pathname]);

  useEffect(() => {
    if (notLessThanLg && isSideNavOpen) {
      toggleSideNav(false);
    }
  }, [notLessThanLg, isSideNavOpen, toggleSideNav]);

  if (!user.isAuthenticated()) {
    const navigateTo = '/login';
    log.debug(`Navigate to ${x(navigateTo)}: msg="unauthenticated"`);
    return (
      <Navigate to={navigateTo} />
    );
  }

  const isAcceptedPath = acceptedPaths.includes(location.pathname);
  if (!isAcceptedPath) {
    const navigateTo = defaultPath;
    log.debug(`Navigate to ${x(navigateTo)}: msg="invalid path"`);
    return (
      <Navigate to={navigateTo} />
    );
  }

  const isWorkspace = location.pathname.startsWith('/workspace');

  return (
    <Box
      ref={ref}
      {...props}
    >
      {!notLessThanLg && (
        <SideNav
          isOpen={isSideNavOpen}
          onClose={() => toggleSideNav(false)}
        />
      )}
      <Header
        onToggle={() => {
          if (notLessThanLg) {
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
      {notLessThanMd && (
        <MiniNav
          isExpanded={notLessThanLg ? isMiniNavExpanded : false}
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
      <Box
        as="main"
        backgroundColor="background.low"
        ml={{
          xs: 0,
          md: layout.mininav.defaultWidth,
          lg: (isMiniNavExpanded) ? layout.mininav.expandedWidth : layout.mininav.defaultWidth,
        }}
        pt={layout.header.height}
      >
        {!isWorkspace && (
          <Box
            sx={{
              height: `calc(100vh - ${layout.header.height}px)`,
            }}
          >
            {location.pathname.startsWith('/about') && (
              <About />
            )}
            {location.pathname.startsWith('/administration/commands') && (
              <Administration.Commands />
            )}
            {location.pathname.startsWith('/administration/events') && (
              <Administration.Events />
            )}
            {location.pathname.startsWith('/administration/general-settings') && (
              <Administration.GeneralSettings />
            )}
            {location.pathname.startsWith('/administration/machine-profiles') && (
              <Administration.Machines />
            )}
            {location.pathname.startsWith('/administration/macros') && (
              <Administration.Macros />
            )}
            {location.pathname.startsWith('/administration/user-accounts') && (
              <Administration.Users />
            )}
            {location.pathname.startsWith('/administration/workspace-settings') && (
              <Administration.WorkspaceSettings />
            )}
          </Box>
        )}
        <Box
          display={isWorkspace ? 'block' : 'none'}
        >
          <Workspace />
        </Box>
      </Box>
    </Box>
  );
});

export default MainPage;
