import { Global, css } from '@emotion/core';
import {
  Toast,
  Box,
  useColorMode,
  useColorStyle,
  useTheme,
} from '@trendmicro/react-styled-ui';
import _get from 'lodash/get';
import pubsub from 'pubsub-js';
import React, { useEffect } from 'react';
import Helmet from 'react-helmet';
import { connect } from 'react-redux';
import { Route, Switch, withRouter } from 'react-router-dom';
import compose from 'recompose/compose';
import ToastLayout from 'app/components/ToastLayout';
import useToast from 'app/components/useToast';
import settings from 'app/config/settings';
import Login from 'app/containers/Login';
import ProtectedPage from 'app/containers/ProtectedPage';
import CorruptedWorkspaceSettingsModal from './modals/CorruptedWorkspaceSettingsModal';
import ProtectedRoute from './ProtectedRoute';

const Layout = (props) => {
  const [colorMode] = useColorMode();
  const [colorStyle] = useColorStyle({ colorMode });
  const { fontSizes, lineHeights } = useTheme();
  const backgroundColor = _get(colorStyle, 'background.primary');
  const color = _get(colorStyle, 'text.primary');

  return (
    <>
      <Global
        styles={css`
          body {
            font-size: ${fontSizes.sm};
            line-height: ${lineHeights.sm};
          }
        `}
      />
      <Box
        backgroundColor={backgroundColor}
        color={color}
        fontSize="sm"
        lineHeight="sm"
        {...props}
      />
    </>
  );
};

const App = ({
  location,
  isInitializing,
  promptUserForCorruptedWorkspaceSettings
}) => {
  const { productName, version } = settings;
  const toast = useToast();

  useEffect(() => {
    const subscriber = pubsub.subscribe('toast.notify', (msg, data) => {
      const {
        severity,
        position = 'bottom-right',
        duration = 5000,
        render,
      } = data;

      toast.notify({
        position,
        duration,
        render: ({ onClose, position }) => {
          return (
            <ToastLayout
              mb="12x"
              mx="4x"
            >
              <Toast
                severity={severity}
                isCloseButtonVisible={true}
                onClose={onClose}
              >
                {render()}
              </Toast>
            </ToastLayout>
          );
        },
      });
    });

    return () => {
      pubsub.unsubscribe(subscriber);
    };
  }, [toast]);

  if (isInitializing) {
    return null;
  }

  if (promptUserForCorruptedWorkspaceSettings) {
    return (
      <Layout>
        <CorruptedWorkspaceSettingsModal />
      </Layout>
    );
  }

  return (
    <Layout>
      <Helmet>
        <title>{`${productName} ${version}`}</title>
      </Helmet>
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
    </Layout>
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
