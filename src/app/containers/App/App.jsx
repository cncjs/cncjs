import React from 'react';
import { connect } from 'react-redux';
import { Route, Switch, withRouter } from 'react-router-dom';
import compose from 'recompose/compose';
import Login from 'app/containers/Login';
import ProtectedPage from 'app/containers/ProtectedPage';
import CorruptedWorkspaceSettingsModal from './modals/CorruptedWorkspaceSettingsModal';
import ProtectedRoute from './ProtectedRoute';

const App = ({
    location,
    isInitializing,
    promptUserForCorruptedWorkspaceSettings
}) => {
    if (isInitializing) {
        return null;
    }

    if (promptUserForCorruptedWorkspaceSettings) {
        return (
            <CorruptedWorkspaceSettingsModal />
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
                component={ProtectedPage}
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
)(App);
