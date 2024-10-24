import { useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Checkbox,
  Flex,
  Icon,
  LinkButton,
  Spinner,
  Switch,
  TextLabel,
  Tooltip,
  useColorMode,
  usePortalManager,
} from '@tonic-ui/react';
import {
  RefreshIcon,
} from '@tonic-ui/react-icons';
import { format } from 'date-fns';
import { ensureArray } from 'ensure-type';
import qs from 'qs';
import React, { useCallback, useMemo, useState } from 'react';
import BaseTable from '@app/components/BaseTable';
import CodePreview from '@app/components/CodePreview';
import IconButton from '@app/components/IconButton';
import TablePagination from '@app/components/TablePagination';
import i18n from '@app/lib/i18n';
import TableRowToggleIcon from '../components/TableRowToggleIcon';
import CreateCommandDrawer from './drawers/CreateCommandDrawer';
import UpdateCommandDrawer from './drawers/UpdateCommandDrawer';
import ConfirmBulkDeleteCommandsModal from './modals/ConfirmBulkDeleteCommandsModal';
import {
  API_COMMANDS_QUERY_KEY,
  useFetchCommandsQuery,
  useBulkDeleteCommandsMutation,
  useEnableCommandMutation,
  useDisableCommandMutation,
  useRunCommandMutation,
} from './queries';

const Loader = (props) => {
  const [colorMode] = useColorMode();
  const backgroundColor = {
    dark: 'rgba(0, 0, 0, .7)',
    light: 'rgba(0, 0, 0, .7)',
  }[colorMode];

  return (
    <Flex
      position="absolute"
      inset={0}
      backgroundColor={backgroundColor}
      alignItems="center"
      justifyContent="center"
      {...props}
    >
      <Spinner />
    </Flex>
  );
};

const Commands = () => {
  // pagination
  const rowsPerPageOptions = [25, 50, 100];
  const minRowsPerPage = Math.min(...rowsPerPageOptions);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(minRowsPerPage);

  // row selection
  const [rowSelection, setRowSelection] = useState({});

  const queryClient = useQueryClient();
  const fetchCommandsQuery = useFetchCommandsQuery({
    meta: {
      query: qs.stringify({
        paging: true,
        page,
        pageLength: rowsPerPage,
      }),
    },
  });
  const bulkDeleteCommandsMutation = useBulkDeleteCommandsMutation({
    onSuccess: () => {
      // Invalidate `useFetchCommandsQuery`
      queryClient.invalidateQueries({ queryKey: API_COMMANDS_QUERY_KEY });
    },
  });
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
  const runCommandMutation = useRunCommandMutation();
  const portal = usePortalManager();
  const [colorMode] = useColorMode();

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
      <ConfirmBulkDeleteCommandsModal
        data={rowIds}
        onClose={close}
        onConfirm={() => {
          const data = {
            ids: rowIds,
          };
          bulkDeleteCommandsMutation.mutate({ data });

          // Close the modal
          close();

          // Update row selection state
          setRowSelection([]);
        }}
      />
    ));
  }, [rowSelection, portal, bulkDeleteCommandsMutation]);

  const handleClickRefresh = useCallback(() => {
    fetchCommandsQuery.refetch();
  }, [fetchCommandsQuery]);

  const handleClickViewCommandDetailsById = useCallback((id) => () => {
    portal((close) => (
      <UpdateCommandDrawer
        id={id}
        onClose={close}
      />
    ));
  }, [portal]);

  const handleToggleStatusById = useCallback((id) => (event) => {
    const checked = event.currentTarget.checked;
    const mutation = checked ? enableCommandMutation : disableCommandMutation;
    mutation.mutate({
      meta: {
        id,
      },
    });
  }, [enableCommandMutation, disableCommandMutation]);

  const handleClickRunCommandById = useCallback((id) => () => {
    runCommandMutation.mutate({
      meta: {
        id,
      },
    });
  }, [runCommandMutation]);

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
      header: i18n._('Command Name'),
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
      header: i18n._('Enabled'),
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
    handleToggleStatusById,
  ]);

  const totalCount = fetchCommandsQuery.data?.pagination?.totalRecords;
  const data = ensureArray(fetchCommandsQuery.data?.records);
  const displayPagination = totalCount > minRowsPerPage;

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
          p="4x"
        >
          <Box width="100%">
            <Box mb="4x">
              <Button
                disabled={!row.original.enabled}
                variant="secondary"
                onClick={handleClickRunCommandById(row.original.id)}
                sx={{
                  columnGap: '2x',
                }}
              >
                {i18n._('Run Command')}
              </Button>
            </Box>
            <CodePreview
              data={data}
              language="shell"
              style={{
                padding: 12,
                width: '100%',
                maxHeight: 180,
                overflowY: 'auto',
              }}
            />
          </Box>
        </Flex>
      </Flex>
    );
  }, [
    colorMode,
    handleClickRunCommandById,
  ]);

  const selectedRowCount = Object.keys(rowSelection).length;

  return (
    <Flex
      sx={{
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <Box flex="none">
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
      </Box>
      <Box
        sx={{
          flex: 'auto',
          height: '100%',
          overflowY: 'auto',
          position: 'relative',
        }}
      >
        {fetchCommandsQuery.isFetching && (
          <Loader />
        )}
        <BaseTable
          columns={columns}
          data={data}
          renderExpandedRow={renderExpandedRow}
          rowSelection={rowSelection}
          enableRowSelection={true}
          onRowSelectionChange={setRowSelection}
        />
      </Box>
      <Box flex="none">
        {displayPagination && (
          <TablePagination
            count={totalCount}
            onPageChange={setPage}
            onRowsPerPageChange={setRowsPerPage}
            page={page}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={rowsPerPageOptions}
          />
        )}
      </Box>
    </Flex>
  );
};

export default Commands;
