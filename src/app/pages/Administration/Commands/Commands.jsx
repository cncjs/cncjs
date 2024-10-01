import { useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Checkbox,
  Flex,
  Icon,
  LinkButton,
  Switch,
  TextLabel,
  Tooltip,
  useColorMode,
  usePortalManager,
} from '@tonic-ui/react';
import { RefreshIcon } from '@tonic-ui/react-icons';
import { format } from 'date-fns';
import { ensureArray } from 'ensure-type';
import React, { useCallback, useMemo, useState } from 'react';
import BaseTable from '@app/components/BaseTable';
import CodePreview from '@app/components/CodePreview';
import IconButton from 'app/components/IconButton';
import i18n from '@app/lib/i18n';
import CreateCommandDrawer from './drawers/CreateCommandDrawer';
import UpdateCommandDrawer from './drawers/UpdateCommandDrawer';
import ConfirmDeleteCommandModal from './modals/ConfirmDeleteCommandModal';
import TableRowToggleIcon from './TableRowToggleIcon';
import {
  API_COMMANDS_QUERY_KEY,
  useFetchCommandsQuery,
  useEnableCommandMutation,
  useDisableCommandMutation,
} from './queries';

const Commands = () => {
  const [rowSelection, setRowSelection] = useState({});
  const queryClient = useQueryClient();
  const fetchCommandsQuery = useFetchCommandsQuery();
  const enableCommandMutation = useEnableCommandMutation({
    onSuccess: () => {
      // Invalidate `useFetchCommandsQuery`
      queryClient.invalidateQueries({ queryKey: API_COMMANDS_QUERY_KEY });
    },
  });
  const disableCommandMutation = useDisableCommandMutation({
    onSuccess: () => {
      // Invalidate `useFetchCommandsQuery`
      queryClient.invalidateQueries({ queryKey: API_COMMANDS_QUERY_KEY });
    },
  });
  const portal = usePortalManager();
  const [colorMode] = useColorMode();
  const handleToggleStatusById = (id) => (event) => {
    const checked = event.currentTarget.checked;
    const mutation = checked ? enableCommandMutation : disableCommandMutation;
    mutation.mutate({
      meta: {
        id,
      },
    });
  };

  const handleClickAdd = useCallback(() => {
    portal((close) => (
      <CreateCommandDrawer
        onClose={close}
      />
    ));
  }, [portal]);

  const handleClickDelete = useCallback(() => {
    const rowIds = Object.keys(rowSelection);
    portal((close) => (
      <ConfirmDeleteCommandModal
        rowIds={rowIds}
        onClose={close}
      />
    ));
  }, [rowSelection, portal]);

  const handleClickViewCommandDetailsById = useCallback((id) => () => {
    portal((close) => (
      <UpdateCommandDrawer
        id={id}
        onClose={close}
      />
    ));
  }, [portal]);

  const handleClickRefresh = useCallback(() => {
    fetchCommandsQuery.refetch();
  }, [fetchCommandsQuery]);

  const columns = useMemo(() => ([
    {
      id: 'selection',
      header: ({ table }) => (
        <Flex alignItems="center" justifyContent="center">
          <Checkbox
            checked={table.getIsAllRowsSelected()}
            indeterminate={table.getIsSomeRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        </Flex>
      ),
      cell: ({ row }) => (
        <Flex alignItems="center" justifyContent="center">
          <Checkbox
            checked={row.getIsSelected()}
            indeterminate={row.getIsSomeSelected()}
            onChange={row.getToggleSelectedHandler()}
          />
        </Flex>
      ),
      minSize: 48,
      size: 48,
    },
    {
      id: 'expand',
      header: () => null,
      cell: ({ row }) => {
        const canExpand = row.getCanExpand();
        const isExpanded = row.getIsExpanded();

        if (!canExpand) {
          return null;
        }

        return (
          <TableRowToggleIcon
            isExpanded={isExpanded}
            onClick={row.getToggleExpandedHandler()}
            sx={{
              height: '100%',
              width: '100%',
            }}
          />
        );
      },
      cellStyle: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        px: 0,
        py: 0,
      },
      minSize: 24,
      size: 24,
    },
    {
      header: i18n._('Name'),
      cell: ({ row }) => (
        <LinkButton onClick={handleClickViewCommandDetailsById(row.original.id)}>
          {row.original.title}
        </LinkButton>
      ),
      size: 'auto',
    },
    {
      header: i18n._('Date Modified'),
      cell: ({ row }) => {
        const dt = new Date(row.original.mtime);
        return format(dt, 'PPpp');
      },
      size: 200,
    },
    {
      id: 'status',
      header: i18n._('Status'),
      cell: ({ row }) => (
        <Flex
          alignItems="center"
          columnGap="2x"
        >
          <Switch
            checked={row.original.enabled}
            onChange={handleToggleStatusById(row.original.id)}
          />
          <TextLabel>
            {row.original.enabled === true ? i18n._('ON') : i18n._('OFF')}
          </TextLabel>
        </Flex>
      ),
      cellStyle: {
        display: 'flex',
        alignItems: 'center',
        py: 0,
      },
      minSize: 80,
    },
  ]), [
    handleClickViewCommandDetailsById,
    handleToggleStatusById
  ]);
  const data = ensureArray(fetchCommandsQuery.data?.records);

  const renderExpandedRow = useCallback(({ row }) => {
    const tableBorderColor = {
      dark: 'gray:70',
      light: 'gray:30',
    }[colorMode];
    const dividerColor = {
      dark: 'gray:60',
      light: 'gray:30',
    }[colorMode];
    const data = row.original.commands;

    return (
      <Flex
        sx={{
          borderBottom: 1,
          borderColor: tableBorderColor,
          width: '100%',
        }}
      >
        <Flex
          flex="none"
          sx={{
            borderRight: 2,
            borderColor: dividerColor,
            width: '15x',
          }}
        />
        <Flex
          flex="auto"
        >
          {!!data && (
            <CodePreview
              data={data}
              language="shell"
            />
          )}
        </Flex>
      </Flex>
    );
  }, [colorMode]);

  const selectedRowCount = Object.keys(rowSelection).length;

  return (
    <Flex
      flexDirection="column"
      height="100%"
    >
      <Flex
        alignItems="flex-start"
        justifyContent="space-between"
        columnGap="6x"
        pt="4x"
        pb="2x"
        px="4x"
      >
        <Flex
          alignItems="center"
          columnGap="4x"
        >
          <Button
            variant="primary"
            onClick={handleClickAdd}
            sx={{
              minWidth: 80,
            }}
          >
            {i18n._('Add')}
          </Button>
          <Button
            disabled={selectedRowCount === 0}
            variant="secondary"
            onClick={handleClickDelete}
            sx={{
              minWidth: 80,
            }}
          >
            {i18n._('Delete')}
          </Button>
        </Flex>
        <Flex
          alignItems="center"
          columnGap="2x"
        >
          <Tooltip label={i18n._('Refresh')}>
            <IconButton
              onClick={handleClickRefresh}
            >
              <Icon
                as={RefreshIcon}
                spin={fetchCommandsQuery.isFetching}
              />
            </IconButton>
          </Tooltip>
        </Flex>
      </Flex>
      <BaseTable
        columns={columns}
        data={data}
        renderExpandedRow={renderExpandedRow}
        state={{
          rowSelection,
        }}
        enableRowSelection={true}
        onRowSelectionChange={setRowSelection}
        sx={{
          height: '100%',
        }}
      />
    </Flex>
  );
};

export default Commands;
