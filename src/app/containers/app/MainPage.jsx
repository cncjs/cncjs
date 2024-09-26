import {
  Box,
  useColorMode,
  useColorStyle,
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
import analytics from '@app/lib/analytics';
import x from '@app/lib/json-stringify';
import log from '@app/lib/log';
import * as user from '@app/lib/user';
import About from '@app/pages/About';
import Administration from '@app/pages/Administration';
import Workspace from '@app/pages/Workspace';
import Header from './Header';
import MiniNav from './MiniNav';
import SideNav from './SideNav';

const MainPage = forwardRef((props, ref) => {
  const [colorMode] = useColorMode();
  const [colorStyle] = useColorStyle({ colorMode });
  const notLessThan640 = useMediaQuery('(min-width: 640px)'); // md
  const notLessThan1024 = useMediaQuery('(min-width: 1024px)'); // lg
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
    analytics.pageview(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    if (notLessThan1024 && isSideNavOpen) {
      toggleSideNav(false);
    }
  }, [notLessThan1024, isSideNavOpen, toggleSideNav]);

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
      <Box
        as="main"
        backgroundColor={colorStyle.background.primary}
        ml={{
          xs: 0,
          md: layout.mininav.defaultWidth,
          lg: (isMiniNavExpanded) ? layout.mininav.expandedWidth : layout.mininav.defaultWidth,
        }}
        pt={layout.header.height}
      >
        {(location.pathname !== '/workspace') && (
          <Box height={`calc(100vh - ${layout.header.height}px)`}>
            {location.pathname.startsWith('/about') && (
              <About />
            )}
            {location.pathname.startsWith('/administration') && (
              <Administration />
            )}
          </Box>
        )}
        <Box
          display={(location.pathname !== '/workspace') ? 'none' : 'block'}
        >
          <Workspace />
        </Box>
      </Box>
    </Box>
  );
});

export default MainPage;
