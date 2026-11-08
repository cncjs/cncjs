import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dropdown,
  DropdownToggle,
  Flex,
  MenuDivider,
  Spinner,
  Text,
} from '@tonic-ui/react';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useToast from '@app/hooks/useToast';
import controller from '@app/lib/controller';
import i18n from '@app/lib/i18n';
import {
  API_COMMANDS_QUERY_KEY,
  useFetchCommandsQuery,
  useRunCommandMutation,
} from '@app/pages/Administration/Commands/queries';

/** Custom server commands, independent of the CNC connection. No props. */
function CommandsMenu() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const query = useFetchCommandsQuery({ meta: { query: 'paging=false' } });
  const mutation = useRunCommandMutation();
  const runs = useRef(new Map());
  const [busy, setBusy] = useState([]);

  useEffect(() => {
    const syncBusy = () => setBusy([...runs.current.keys()]);
    const onStart = (taskId, context) => {
      const id = context?.id;
      const run = runs.current.get(id) || {};
      run.taskId = taskId;
      runs.current.set(id, run);
      syncBusy();
    };
    const onFinish = (taskId) => {
      for (const [id, run] of runs.current) {
        if (run.taskId === taskId) {
          runs.current.delete(id);
        }
      }
      syncBusy();
    };
    const onConfigChange = () => queryClient.invalidateQueries({ queryKey: API_COMMANDS_QUERY_KEY });
    controller.addListener('task:start', onStart);
    controller.addListener('task:end', onFinish);
    controller.addListener('task:error', onFinish);
    controller.addListener('config:change', onConfigChange);
    return () => {
      controller.removeListener('task:start', onStart);
      controller.removeListener('task:end', onFinish);
      controller.removeListener('task:error', onFinish);
      controller.removeListener('config:change', onConfigChange);
    };
  }, [queryClient]);

  const runCommand = async (command) => {
    if (runs.current.has(command.id)) {
      return;
    }
    const run = {};
    runs.current.set(command.id, run);
    setBusy([...runs.current.keys()]);
    try {
      const { taskId } = await mutation.mutateAsync({ meta: { id: command.id } });
      // Socket task completion can arrive before the HTTP response.
      if (runs.current.get(command.id) === run) {
        run.taskId = taskId;
      }
    } catch (error) {
      if (runs.current.get(command.id) === run) {
        runs.current.delete(command.id);
      }
      setBusy([...runs.current.keys()]);
      toast({
        appearance: 'error',
        content: i18n._('The command "{{command}}" encountered an error. Details: {{error}}', {
          command: command.name || command.action,
          error: error.message,
        }),
      });
    }
  };
  const commands = (query.data?.records || []).filter(command => command.enabled);

  // Data-driven items route both pointer clicks and Enter/Space through
  // `onChange`; the installed Dropdown wires onClick and onKeyDown with
  // `defaultPrevented` guards, so each activation selects exactly once.
  const items = [];
  if (query.isLoading) {
    items.push({ type: 'custom', label: <Text role="status" px="3x" py="2x">{i18n._('Loading')}</Text> });
  }
  if (query.isError) {
    items.push({ label: i18n._('Retry'), onSelect: () => query.refetch() });
  }
  if (!query.isLoading && !query.isError && commands.length === 0) {
    items.push({ type: 'custom', label: <Text px="3x" py="2x">{i18n._('No commands available')}</Text> });
  }
  commands.forEach(command => {
    items.push({
      label: (
        <Flex alignItems="center" gap="2x">
          {busy.includes(command.id) && <Spinner size="xs" />}
          <Text>{command.name || command.action}</Text>
        </Flex>
      ),
      command,
      props: {
        title: command.action,
        disabled: busy.includes(command.id),
      },
    });
  });

  const handleSelect = (item) => {
    if (item?.onSelect) {
      item.onSelect();
      return;
    }
    if (item?.command) {
      runCommand(item.command);
    }
  };

  const manageItem = {
    label: <FontAwesomeIcon icon="pencil-alt" fixedWidth />,
    onSelect: () => navigate('/administration/commands'),
    props: {
      'aria-label': i18n._('Manage Commands'),
      title: i18n._('Manage Commands'),
      sx: { width: 'auto', px: '2x', py: '1x' },
    },
  };

  return (
    <Dropdown
      items={items}
      placement="bottom-end"
      renderToggle={() => (
        <DropdownToggle aria-label={i18n._('Commands')}>
          <FontAwesomeIcon icon="terminal" fixedWidth />
        </DropdownToggle>
      )}
      renderContent={({ renderItems }) => (
        <>
          <Flex
            alignItems="center" justifyContent="space-between" gap="2x"
            px="3x" py="2x"
          >
            <Text
              as="h2"
              fontSize="sm"
              fontWeight="semibold"
              lineHeight="sm"
              m={0}
            >
              {i18n._('Commands')}
            </Text>
            {renderItems([manageItem])}
          </Flex>
          <MenuDivider />
          {renderItems(items)}
        </>
      )}
      onChange={handleSelect}
    />
  );
}

export default CommandsMenu;
