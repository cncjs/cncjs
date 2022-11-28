import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Alert,
  Box,
  Button,
  Flex,
  Space,
  Text,
  useColorMode,
  useColorStyle,
} from '@tonic-ui/react';
import { useActor } from '@xstate/react';
import { ensureArray } from 'ensure-type';
import _get from 'lodash/get';
import _includes from 'lodash/includes';
import React, { useContext } from 'react';
import { connect } from 'react-redux';
import RenderBlock from 'app/components/RenderBlock';
import {
  CONNECTION_STATE_CONNECTED,
} from 'app/constants/connection';
import {
  MACHINE_STATE_NONE,
  REFORMED_MACHINE_STATE_IDLE,
  REFORMED_MACHINE_STATE_RUN,
} from 'app/constants/controller';
import {
  WORKFLOW_STATE_IDLE,
  WORKFLOW_STATE_PAUSED,
  WORKFLOW_STATE_RUNNING,
} from 'app/constants/workflow';
import useEffectOnce from 'app/hooks/useEffectOnce';
import useMount from 'app/hooks/useMount';
import controller from 'app/lib/controller';
import i18n from 'app/lib/i18n';
import iframeExport from 'app/lib/iframe-export';
import portal from 'app/lib/portal';
import configStore from 'app/store/config';
import LoadMacro from './modals/LoadMacro';
import EditMacro from './modals/EditMacro';
import NewMacro from './modals/NewMacro';
import RunMacro from './modals/RunMacro';
import { ServiceContext } from './context';

const exportMacros = () => {
  const url = '/api/macros/export';
  const data = {
    filename: 'macros',
  };
  const token = configStore.get('session.token');
  iframeExport(url, data, {
    token,
  });
};

function Macro({
  canLoadMacro,
  canRunMacro,
}) {
  const [colorMode] = useColorMode();
  const [colorStyle] = useColorStyle({ colorMode });
  const secondaryColor = colorStyle?.color?.secondary;
  const borderColor = {
    dark: 'gray:60',
    light: 'gray:30'
  }[colorMode];
  const dividerColor = {
    dark: 'gray:60',
    light: 'gray:30'
  }[colorMode];
  const toolbarBackgroundColor = {
    dark: 'gray:90',
    light: 'gray:10',
  }[colorMode];
  const { fetchMacrosService } = useContext(ServiceContext);
  const [state, send] = useActor(fetchMacrosService);

  useEffectOnce(() => {
    const onConfigChange = () => {
      send({ type: 'FETCH' });
    };

    controller.addListener('config:change', onConfigChange);

    return () => {
      controller.removeListener('config:change', onConfigChange);
    };
  });

  useMount(() => {
    send({ type: 'FETCH' });
  });

  const handleNewMacro = () => {
    portal(({ onClose }) => (
      // TODO
      <NewMacro onClose={onClose} />
    ));
  };
  const handleRefreshMacros = () => {
    send({ type: 'CLEAR' });
    send({ type: 'FETCH' });
  };
  const handleExportMacros = () => {
    exportMacros();
  };
  const handleLoadMacro = (macro) => () => {
    const { id, name } = macro;
    portal(({ onClose }) => (
      // TODO
      <LoadMacro onClose={onClose} id={id} name={name} />
    ));
  };
  const handleRunMacro = (macro) => () => {
    const { id, name, content } = macro;
    portal(({ onClose }) => (
      // TODO
      <RunMacro
        onClose={onClose} id={id} name={name}
        content={content}
      />
    ));
  };
  const handleEditMacro = (macro) => () => {
    const { id, name, content } = macro;
    portal(({ onClose }) => (
      // TODO
      <EditMacro
        onClose={onClose} id={id} name={name}
        content={content}
      />
    ));
  };

  return (
    <Box>
      <Flex
        align="center"
        justify="space-between"
        backgroundColor={toolbarBackgroundColor}
        borderBottom={1}
        borderColor={borderColor}
        px="3x"
        py="2x"
      >
        <Box>
          <Button
            variant="secondary"
            onClick={handleNewMacro}
          >
            <FontAwesomeIcon icon="plus" fixedWidth />
            <Space width={8} />
            {i18n._('New')}
          </Button>
        </Box>
        <Box>
          <Button
            variant="secondary"
            onClick={handleExportMacros}
          >
            <FontAwesomeIcon icon="file-export" fixedWidth />
            <Space width={8} />
            {i18n._('Export')}
          </Button>
          <Button
            variant="secondary"
            onClick={handleRefreshMacros}
            title={i18n._('Refresh')}
          >
            <FontAwesomeIcon icon="sync-alt" fixedWidth />
          </Button>
        </Box>
      </Flex>
      <RenderBlock>
        {() => {
          if (!state) {
            return null;
          }

          const isLoading = (state.value === 'loading');
          const isFailure = (state.value === 'failure');
          const data = _get(state.context, 'data');

          if (isLoading && !data) {
            return (
              <Box px="3x" py="2x">
                <Text color={secondaryColor}>
                  {i18n._('Loading...')}
                </Text>
              </Box>
            );
          }

          if (isFailure) {
            return (
              <Alert severity="error">
                <Box mb="1x">
                  <Text fontWeight="bold">{i18n._('Error')}</Text>
                </Box>
                <Text mr={-36}>
                  {i18n._('An error occurred while fetching data.')}
                </Text>
              </Alert>
            );
          }

          const macros = ensureArray(_get(data, 'data.records'));
          const isEmpty = macros.length === 0;
          if (isEmpty) {
            return (
              <Box px="3x" py="2x">
                <Text color={secondaryColor}>
                  {i18n._('No macros available')}
                </Text>
              </Box>
            );
          }

          return (
            <Box>
              {macros.map((macro, index) => (
                <Flex
                  key={macro.id}
                  align="center"
                  borderBottom={1}
                  borderColor={dividerColor}
                  px="3x"
                  py="2x"
                >
                  <Box flex="auto">
                    <Button
                      disabled={!canRunMacro}
                      onClick={handleRunMacro(macro)}
                      title={i18n._('Run Macro')}
                    >
                      <FontAwesomeIcon icon="play" fixedWidth />
                    </Button>
                    <Space width={8} />
                    {macro.name}
                  </Box>
                  <Box>
                    <Button
                      disabled={!canLoadMacro}
                      onClick={handleLoadMacro(macro)}
                      title={i18n._('Load Macro')}
                    >
                      <FontAwesomeIcon icon="chevron-up" fixedWidth />
                    </Button>
                    <Button
                      onClick={handleEditMacro(macro)}
                    >
                      <FontAwesomeIcon icon="edit" fixedWidth />
                    </Button>
                  </Box>
                </Flex>
              ))}
            </Box>
          );
        }}
      </RenderBlock>
    </Box>
  );
}

export default connect(store => {
  const isActionable = (() => {
    const connectionState = _get(store, 'connection.state');
    const isConnected = (connectionState === CONNECTION_STATE_CONNECTED);
    if (!isConnected) {
      return false;
    }

    const workflowState = _get(store, 'controller.workflow.state');
    const isWorkflowRunning = (workflowState === WORKFLOW_STATE_RUNNING);
    if (isWorkflowRunning) {
      return false;
    }

    const reformedMachineState = _get(store, 'controller.reformedMachineState');
    const expectedStates = [
      MACHINE_STATE_NONE, // No machine state reported (e.g. Marlin).
      REFORMED_MACHINE_STATE_IDLE,
      REFORMED_MACHINE_STATE_RUN,
    ];
    const isExpectedState = _includes(expectedStates, reformedMachineState);
    return isExpectedState;
  })();
  const workflowState = _get(store, 'controller.workflow.state');
  const canLoadMacro = isActionable && _includes([
    WORKFLOW_STATE_IDLE,
  ], workflowState);
  const canRunMacro = isActionable && _includes([
    WORKFLOW_STATE_IDLE,
    WORKFLOW_STATE_PAUSED,
  ], workflowState);

  return {
    canLoadMacro,
    canRunMacro,
  };
})(Macro);
