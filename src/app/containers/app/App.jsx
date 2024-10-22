import { Global, css } from '@emotion/react';
import {
  Box,
  Text,
  useColorMode,
  useColorStyle,
  useTheme,
} from '@tonic-ui/react';
import pubsub from 'pubsub-js';
import React, { useEffect } from 'react';
import Helmet from 'react-helmet';
import { connect } from 'react-redux';
import { Route, Routes } from 'react-router-dom';
import compose from 'recompose/compose';
import settings from '@app/config/settings';
import useToast from '@app/hooks/useToast';
import controller from '@app/lib/controller';
import i18n from '@app/lib/i18n';
import CorruptedWorkspaceSettingsModal from './modals/CorruptedWorkspaceSettingsModal';
import LoginPage from './LoginPage';
import MainPage from './MainPage';

function Layout(props) {
  const [colorMode] = useColorMode();
  const [colorStyle] = useColorStyle({ colorMode });
  const { colors, fontSizes, lineHeights } = useTheme();
  const backgroundColor = colorStyle.background.primary;
  const color = colorStyle.color.primary;
  const scrollbarThumbBackgroundColor = colorStyle.color.disabled;
  const scrollbarThumbHoverBackgroundColor = colorStyle.color.tertiary;
  const scrollbarThumbHoverBorderColor = colorStyle.color.secondary;
  const scrollbarTrackBackgroundColor = {
    light: 'gray:30',
    dark: 'gray:70',
  }[colorMode];

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
          ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          ::-webkit-scrollbar-track {
            background-color: ${colors[scrollbarTrackBackgroundColor]};
          }
          ::-webkit-scrollbar-thumb {
            background-color: ${colors[scrollbarThumbBackgroundColor]};
          }
          ::-webkit-scrollbar-thumb:hover {
            background-color: ${colors[scrollbarThumbHoverBackgroundColor]};
            border: 1px solid ${colors[scrollbarThumbHoverBorderColor]};
          }
          body {
            background-color: ${colors[backgroundColor]};
            color: ${colors[color]};
            font-size: ${fontSizes.sm};
            line-height: ${lineHeights.sm};
          }
          pre {
            margin: 0;
          }
        `}
      />
      <Box {...props} />
    </>
  );
}

function App({
  isInitializing,
  promptUserForCorruptedWorkspaceSettings
}) {
  const { productName, version } = settings;
  const toast = useToast();

  useEffect(() => {
    const taskMap = new Map();

    const onTaskStart = (taskId, context) => {
      taskMap.set(taskId, {
        id: context?.id,
        name: context?.name,
        data: '',
      });
    };
    const onTaskData = (taskId, data) => {
      const str = (data instanceof ArrayBuffer)
        ? new TextDecoder('utf-8').decode(data)
        : data;
      const task = taskMap.get(taskId);
      task.data += str;
    };
    const onTaskEnd = (taskId, code) => {
      const task = taskMap.get(taskId);

      toast({
        appearance: code === 0 ? 'success' : 'warning',
        content: (
          <>
            <Text>
              {i18n._('Command executed (exitCode={{code}})', { code })}
            </Text>
            <Text>
              {task.name}
            </Text>
          </>
        ),
        duration: 10 * 1000,
        placement: 'bottom-right',
      });

      taskMap.delete(taskId);
    };
    const onTaskError = (taskId, error) => {
      const task = taskMap.get(taskId);

      toast({
        appearance: 'error',
        content: (
          <>
            <Text>
              {i18n._('Command failed: {error}', { error })}
            </Text>
            <Text>
              {task.name}
            </Text>
          </>
        ),
        duration: null,
        placement: 'bottom-right',
      });

      taskMap.delete(taskId);
    };

    controller.addListener('task:start', onTaskStart);
    controller.addListener('task:data', onTaskData);
    controller.addListener('task:end', onTaskEnd);
    controller.addListener('task:error', onTaskError);

    return () => {
      taskMap.clear();
      controller.removeListener('task:start', onTaskStart);
      controller.removeListener('task:data', onTaskData);
      controller.removeListener('task:end', onTaskEnd);
      controller.removeListener('task:error', onTaskError);
    };
  }, [toast]);

  useEffect(() => {
    const subscriber = pubsub.subscribe('toast.notify', (msg, data) => {
      const {
        appearance,
        placement,
        duration,
        render,
      } = data;

      toast({
        appearance,
        content: render(),
        duration,
        placement,
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
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<MainPage />} />
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
