import { useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Checkbox,
  Divider,
  Flex,
  Icon,
  LinkButton,
  OverflowTooltip,
  Stack,
  Switch,
  Text,
  TextLabel,
  Tooltip,
  useColorMode,
  usePortalManager,
} from '@tonic-ui/react';
import {
  PlayIcon,
  RefreshIcon,
} from '@tonic-ui/react-icons';
import * as dateFns from 'date-fns';
import { ensureArray } from 'ensure-type';
import qs from 'qs';
import React, { useCallback, useMemo, useState } from 'react';
import BaseTable from '@app/components/BaseTable';
import CodePreview from '@app/components/CodePreview';
import IconButton from '@app/components/IconButton';
import TablePagination from '@app/components/TablePagination';
import {
  DEFAULT_ROWS_PER_PAGE_OPTIONS,
} from '@app/components/TablePagination/constants';
import i18n from '@app/lib/i18n';
import TableRowToggleIcon from '../components/TableRowToggleIcon';
import ConfirmBulkDeleteRecordsModal from '../modals/ConfirmBulkDeleteRecordsModal';
import CreateCommandDrawer from './drawers/CreateCommandDrawer';
import UpdateCommandDrawer from './drawers/UpdateCommandDrawer';
import {
  API_COMMANDS_QUERY_KEY,
  useFetchCommandsQuery,
  useBulkDeleteCommandsMutation,
  useBulkEnableCommandsMutation,
  useBulkDisableCommandsMutation,
  useEnableCommandMutation,
  useDisableCommandMutation,
  useRunCommandMutation,
} from './queries';

const Commands = () => {
  // pagination
  const rowsPerPageOptions = ensureArray(DEFAULT_ROWS_PER_PAGE_OPTIONS);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(rowsPerPageOptions[0]);

  // row selection
  const [rowSelection, setRowSelection] = useState({});
  const clearRowSelection = useCallback(() => {
    setRowSelection({});
  }, []);

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
  const bulkEnableCommandsMutation = useBulkEnableCommandsMutation({
    onSuccess: () => {
      // Invalidate `useFetchCommandsQuery`
      queryClient.invalidateQueries({ queryKey: API_COMMANDS_QUERY_KEY });
    },
  });
  const bulkDisableCommandsMutation = useBulkDisableCommandsMutation({
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
  const selectedRowCount = Object.keys(rowSelection).length;
  const isRowSelectionDisabled = fetchCommandsQuery.isFetching;
  const isLoadingData = fetchCommandsQuery.isFetching;
  const data = ensureArray(fetchCommandsQuery.data?.records);
  const totalCount = fetchCommandsQuery.data?.pagination?.totalRecords;
  const totalPages = Math.ceil(totalCount / rowsPerPage);

  const handleClickAdd = useCallback(() => {
    portal((close) => (
      <CreateCommandDrawer
        onClose={close}
      />
    ));
  }, [portal]);

  const handleClickBulkDelete = useCallback(() => {
    const rowIds = Object.keys(rowSelection);
    portal((close) => (
      <ConfirmBulkDeleteRecordsModal
        data={rowIds}
        onClose={close}
        onConfirm={() => {
          const data = {
            ids: rowIds,
          };
          bulkDeleteCommandsMutation.mutate({ data });

          // Close the modal
          close();

          // Clear row selection
          clearRowSelection();
        }}
      />
    ));
  }, [portal, rowSelection, bulkDeleteCommandsMutation, clearRowSelection]);

  const handleClickBulkEnable = useCallback(() => {
    const rowIds = Object.keys(rowSelection);
    const data = {
      ids: rowIds,
    };
    bulkEnableCommandsMutation.mutate({ data });

    // Clear row selection
    clearRowSelection();
  }, [rowSelection, bulkEnableCommandsMutation, clearRowSelection]);

  const handleClickBulkDisable = useCallback(() => {
    const rowIds = Object.keys(rowSelection);
    const data = {
      ids: rowIds,
    };
    bulkDisableCommandsMutation.mutate({ data });

    // Clear row selection
    clearRowSelection();
  }, [rowSelection, bulkDisableCommandsMutation, clearRowSelection]);

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
            disabled={isRowSelectionDisabled}
            checked={table.getIsAllRowsSelected()}
            indeterminate={table.getIsSomeRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        </Flex>
      ),
      cell: ({ row }) => (
        <Flex alignItems="center" justifyContent="center">
          <Checkbox
            disabled={isRowSelectionDisabled}
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
      minSize: 48,
      size: 48,
    },
    {
      header: i18n._('Command Name'),
      cell: ({ row }) => (
        <OverflowTooltip label={row.original.name}>
          {({ ref, style }) => (
            <LinkButton
              onClick={handleClickViewCommandDetailsById(row.original.id)}
              width="100%"
            >
              <Text ref={ref} {...style}>
                {row.original.name}
              </Text>
            </LinkButton>
          )}
        </OverflowTooltip>
      ),
      size: 'auto',
    },
    {
      header: i18n._('Date Modified'),
      cell: ({ row }) => {
        const dt = new Date(row.original.mtime);
        const value = dateFns.format(dt, 'PPpp');

        return (
          <OverflowTooltip label={value}>
            {value}
          </OverflowTooltip>
        );
      },
      size: 200,
    },
    {
      id: 'status',
      header: i18n._('Status'),
      cell: ({ row }) => {
        const textLabel = row.original.enabled === true ? i18n._('ON') : i18n._('OFF');
        return (
          <Flex
            alignItems="center"
            columnGap="2x"
            width="100%"
          >
            <Switch
              checked={row.original.enabled}
              onChange={handleToggleStatusById(row.original.id)}
            />
            <OverflowTooltip label={textLabel}>
              {textLabel}
            </OverflowTooltip>
          </Flex>
        );
      },
      cellStyle: {
        display: 'flex',
        alignItems: 'center',
        py: 0,
      },
      minSize: 100,
    },
  ]), [
    isRowSelectionDisabled,
    handleClickViewCommandDetailsById,
    handleToggleStatusById,
  ]);

  const renderExpandedRow = useCallback(({ row }) => {
    const tableBorderColor = {
      dark: 'gray:70',
      light: 'gray:30',
    }[colorMode];
    const dividerColor = {
      dark: 'gray:60',
      light: 'gray:30',
    }[colorMode];
    const data = row.original.data;

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
            width: '12x',
          }}
        />
        <Flex
          flex="auto"
        >
          <Stack width="100%">
            <Flex
              alignItems="center"
              px="4x"
            >
              <TextLabel my="3x">
                {i18n._('Command Action')}
              </TextLabel>
              <Divider
                variant="solid"
                orientation="vertical"
                sx={{
                  height: '8x',
                  mx: '4x',
                  my: '1x',
                }}
              />
              <Tooltip label={i18n._('Run')}>
                <IconButton
                  disabled={!row.original.enabled}
                  onClick={handleClickRunCommandById(row.original.id)}
                >
                  <PlayIcon />
                </IconButton>
              </Tooltip>
            </Flex>
            <Box>
              <CodePreview
                data={data}
                language="shell"
                style={{
                  padding: 16,
                  width: '100%',
                  maxHeight: 180,
                  overflowY: 'auto',
                }}
              />
            </Box>
          </Stack>
        </Flex>
      </Flex>
    );
  }, [
    colorMode,
    handleClickRunCommandById,
  ]);

  return (
    <Flex
      sx={{
        flexDirection: 'column',
        height: '100%',
        overflowY: 'auto',
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
            columnGap="2x"
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
              onClick={handleClickBulkDelete}
              sx={{
                minWidth: 80,
              }}
            >
              {i18n._('Delete')}
            </Button>
            <Button
              disabled={selectedRowCount === 0}
              variant="secondary"
              onClick={handleClickBulkEnable}
              sx={{
                minWidth: 80,
              }}
            >
              {i18n._('Enable')}
            </Button>
            <Button
              disabled={selectedRowCount === 0}
              variant="secondary"
              onClick={handleClickBulkDisable}
              sx={{
                minWidth: 80,
              }}
            >
              {i18n._('Disable')}
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
          minHeight: 100,
        }}
      >
        <BaseTable
          isLoading={isLoadingData}
          columns={columns}
          data={data}
          renderExpandedRow={renderExpandedRow}
          rowSelection={rowSelection}
          enableRowSelection={true}
          onRowSelectionChange={setRowSelection}
        />
      </Box>
      <Box flex="none">
        <TablePagination
          count={totalCount}
          disabled={totalCount === 0}
          onPageChange={(page) => {
            setPage(page);

            // Clear row selection when the page changes
            clearRowSelection();
          }}
          onRowsPerPageChange={(rowsPerPage) => {
            setRowsPerPage(rowsPerPage);

            // Clear row selection when the number of rows per page changes
            clearRowSelection();
          }}
          page={page}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={rowsPerPageOptions}
          showFirstButton={totalPages > 4}
          showLastButton={totalPages > 4}
        />
      </Box>
    </Flex>
  );
};

export default Commands;
