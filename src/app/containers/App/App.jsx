import React from 'react';
import { connect } from 'react-redux';
import { Route, Switch, withRouter } from 'react-router-dom';
import compose from 'recompose/compose';
import branch from 'recompose/branch';
import renderNothing from 'recompose/renderNothing';
import ProtectedRoute from 'app/components/ProtectedRoute';
import Login from 'app/containers/Login';
import Main from 'app/containers/Main';
import CorruptedWorkspaceSettings from './CorruptedWorkspaceSettings';

const App = ({
    promptUserForCorruptedWorkspaceSettings
}) => {
    if (promptUserForCorruptedWorkspaceSettings) {
        return (
            <CorruptedWorkspaceSettings />
        );
    }

    return (
        <Switch>
            <Route
                exact
                path="/login"
                component={Login}
            />
            <ProtectedRoute
                path="/"
                component={Main}
            />
        </Switch>
    );
};

export default compose(
    withRouter,
    connect(
        (state, ownProps) => ({ // mapStateToProps
            isInitializing: state.container.app.isInitializing,
            error: state.container.app.error,
            promptUserForCorruptedWorkspaceSettings: state.container.app.promptUserForCorruptedWorkspaceSettings
        }),
        (dispatch) => ({ // mapDispatchToProps
        })
    ),
    // Display a loading spinner while initializing the application...
    branch(
        ({ isInitializing }) => isInitializing,
        renderNothing
    ),
)(App);
