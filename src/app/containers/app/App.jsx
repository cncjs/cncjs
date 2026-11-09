import { Global, css } from '@emotion/react';
import {
  Box,
  LinkButton,
  Stack,
  Text,
  useColorMode,
  useTheme,
} from '@tonic-ui/react';
import { ensureString } from 'ensure-type';
import pubsub from 'pubsub-js';
import React, { useEffect } from 'react';
import Helmet from 'react-helmet';
import { connect } from 'react-redux';
import { useQueryClient } from '@tanstack/react-query';
import { Route, Routes } from 'react-router-dom';
import compose from 'recompose/compose';
import settings from '@app/config/settings';
import useToast from '@app/hooks/useToast';
import controller from '@app/lib/controller';
import i18n from '@app/lib/i18n';
import MacroQueryEvents from '@app/queries/MacroQueryEvents';
import { createSessionQueryBoundary } from '@app/queries/session';
import CorruptedWorkspaceSettingsModal from './modals/CorruptedWorkspaceSettingsModal';
import LoginPage from './LoginPage';
import MainPage from './MainPage';

function Layout(props) {
  const [colorMode] = useColorMode();
  const theme = useTheme();
  const { fontSizes, lineHeights } = theme;

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
            background-color: ${theme.get('colors._component.scrollbar.track.enabled')};
          }
          ::-webkit-scrollbar-thumb {
            background-color: ${theme.get('colors._component.scrollbar.thumb.enabled')};
          }
          ::-webkit-scrollbar-thumb:hover {
            background-color: ${theme.get('colors._component.scrollbar.thumb.hovered')};
            border: 1px solid ${theme.get('colors.border.secondary')};
          }
          body {
            background-color: ${theme.get('colors.background.highest')};
            color: ${theme.get('colors.text.primary')};
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
  const queryClient = useQueryClient();

  useEffect(() => createSessionQueryBoundary(queryClient), [queryClient]);

  useEffect(() => {
    const taskMap = new Map();

    const onTaskStart = (taskId, context) => {
      taskMap.set(taskId, { context, data: '' });

      toast({
        appearance: 'info',
        content: (
          <Text>
            {i18n._('The command "{{command}}" has started.', { command: context?.name })}
          </Text>
        ),
      });
    };
    const onTaskData = (taskId, data) => {
      const task = taskMap.get(taskId);
      const str = (data instanceof ArrayBuffer)
        ? new TextDecoder('utf-8').decode(data)
        : ensureString(data);
      task.data += str;
    };
    const onTaskEnd = (taskId, code) => {
      const task = taskMap.get(taskId);
      const context = task?.context;

      const handleClickViewDetails = () => {
        const win = window.open('', '_blank');
        win.document.write('<pre>' + task.data + '</pre>');
      };

      const isZeroExitCode = (code === 0);

      toast({
        appearance: isZeroExitCode ? 'success' : 'warning',
        content: (
          <Stack spacing="2x">
            <Text>
              {i18n._('The command "{{command}}" has completed with exit code {{code}}.', { command: context?.name, code })}
            </Text>
            <LinkButton onClick={handleClickViewDetails}>
              {i18n._('View Details')}
            </LinkButton>
          </Stack>
        ),
      });

      taskMap.delete(taskId);
    };
    const onTaskError = (taskId, error) => {
      const task = taskMap.get(taskId);
      const context = task?.context;

      const handleClickViewDetails = () => {
        const win = window.open('', '_blank');
        win.document.write('<pre>' + task.data + '</pre>');
      };

      toast({
        appearance: 'error',
        content: (
          <Stack spacing="2x">
            <Text>
              {i18n._('The command "{{command}}" encountered an error. Details: {{error}}', { command: context?.name, error })}
            </Text>
            <LinkButton onClick={handleClickViewDetails}>
              {i18n._('View Details')}
            </LinkButton>
          </Stack>
        ),
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
        duration,
        placement,
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

  let content = null;
  if (!isInitializing && promptUserForCorruptedWorkspaceSettings) {
    content = (
      <Layout>
        <CorruptedWorkspaceSettingsModal />
      </Layout>
    );
  } else if (!isInitializing) {
    content = (
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

  return (
    <>
      <MacroQueryEvents />
      {content}
    </>
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
