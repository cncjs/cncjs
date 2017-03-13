import React from 'react';
import { Route, Redirect, withRouter } from 'react-router-dom';
import user from '../../lib/user';

const ProtectedRoute = ({ component: Component, ...rest }) => (
    <Route
        {...rest}
        render={props => {
            if (user.authenticated()) {
                return Component ? <Component {...rest} /> : null;
            }

            return (
                <Redirect
                    to={{
                        pathname: '/login',
                        state: {
                            from: props.location
                        }
                    }}
                />
            );
        }}
    />
);

ProtectedRoute.propTypes = {
    ...withRouter.propTypes
};

export default ProtectedRoute;
