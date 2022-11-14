import { Global, css } from '@emotion/react';
import {
  Box,
  Toast,
  useColorMode,
  useColorStyle,
  useTheme,
  useToast,
} from '@tonic-ui/react';
import pubsub from 'pubsub-js';
import React, { useEffect } from 'react';
import Helmet from 'react-helmet';
import { connect } from 'react-redux';
import { Route, Routes } from 'react-router-dom';
import compose from 'recompose/compose';
import settings from 'app/config/settings';
import Login from 'app/containers/Login';
import ProtectedPage from 'app/containers/ProtectedPage';
import CorruptedWorkspaceSettingsModal from './modals/CorruptedWorkspaceSettingsModal';

function Layout(props) {
  const [colorMode] = useColorMode();
  const [colorStyle] = useColorStyle({ colorMode });
  const theme = useTheme();
  const backgroundColor = colorStyle.background.primary;
  const color = colorStyle.color.primary;

  return (
    <>
      <Global
        styles={css`
          :root {
            color-scheme: ${colorMode};
          }
          :focus:not(:focus-visible) {
            outline: none;
          }
          body {
            font-size: ${theme.fontSizes.sm};
            line-height: ${theme.lineHeights.sm};
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
}

function ToastLayout(props) {
  const [colorMode] = useColorMode();
  const [colorStyle] = useColorStyle({ colorMode });
  const boxShadow = colorStyle?.shadow?.thin;

  return (
    <Box
      fontSize="sm"
      lineHeight="sm"
      textAlign="left"
      boxShadow={boxShadow}
      width={320}
      {...props}
    />
  );
}

function App({
  isInitializing,
  promptUserForCorruptedWorkspaceSettings
}) {
  const { productName, version } = settings;
  const toast = useToast();

  useEffect(() => {
    const subscriber = pubsub.subscribe('toast.notify', (msg, data) => {
      const {
        appearance,
        placement,
        duration = 5000,
        render,
      } = data;

      toast(({ onClose, placement }) => {
        const styleProps = {
          'top-left': { mt: '2x', mx: '4x' },
          'top': { mt: '2x', mx: '4x' },
          'top-right': { mt: '2x', mx: '4x' },
          'bottom-left': { mb: '2x', mx: '4x' },
          'bottom': { mb: '2x', mx: '4x' },
          'bottom-right': { mb: '2x', mx: '4x' },
        }[placement];

        return (
          <ToastLayout {...styleProps}>
            <Toast
              appearance={appearance}
              isClosable
              onClose={onClose}
            >
              {render()}
            </Toast>
          </ToastLayout>
        );
      }, {
        placement,
        duration,
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
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={<ProtectedPage />} />
      </Routes>
    </Layout>
  );
}

export default compose(
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
