import {
  Box,
} from '@tonic-ui/react';
import {
  useToggle,
} from '@tonic-ui/react-hooks';
import React, { forwardRef, useEffect } from 'react';
import { Redirect, useLocation } from 'react-router-dom';
import Administration from 'app/containers/Administration';
import Header from 'app/containers/Header';
import Main from 'app/containers/Main';
import { MiniNav, SideNav } from 'app/containers/Nav';
import Workspace from 'app/containers/Workspace';
import analytics from 'app/lib/analytics';

const ProtectedPage = forwardRef((props, ref) => {
  const [isSideNavOpen, toggleSideNav] = useToggle(false);
  const location = useLocation();

  useEffect(() => {
    analytics.pageview(location.pathname);
  }, [location.pathname]);

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
      <Redirect
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
    <Box ref={ref} {...props}>
      <MiniNav id="sidebar" />
      <SideNav
        isSideNavOpen={isSideNavOpen}
        toggleSideNav={toggleSideNav}
      />
      <Header
        toggleSideNav={toggleSideNav}
      />
      <Main>
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
