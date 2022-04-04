import React from 'react';
import { Route, Redirect, useLocation } from 'react-router-dom';
import * as user from 'app/lib/user';
import log from 'app/lib/log';

const ProtectedRoute = ({
  component: Component,
  ...rest
}) => {
  const location = useLocation();

  return (
    <Route
      {...rest}
      render={props => {
        if (user.isAuthenticated()) {
          return Component ? <Component {...rest} /> : null;
        }

        const redirectFrom = location.pathname;
        const redirectTo = '/login';
        if (redirectFrom === redirectTo) {
          return null;
        }

        log.debug(`Redirect from "${redirectFrom}" to "${redirectTo}"`);

        return (
          <Redirect
            to={{
              pathname: '/login',
              state: {
                from: location
              }
            }}
          />
        );
      }}
    />
  );
};

export default ProtectedRoute;
