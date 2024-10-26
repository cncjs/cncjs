import { useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Checkbox,
  Flex,
  Icon,
  LinkButton,
  OverflowTooltip,
  Switch,
  Text,
  Tooltip,
  useColorMode,
  usePortalManager,
} from '@tonic-ui/react';
import {
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
import CreateUserDrawer from './drawers/CreateUserDrawer';
import UpdateUserDrawer from './drawers/UpdateUserDrawer';
import {
  API_USERS_QUERY_KEY,
  useFetchUsersQuery,
  useBulkDeleteUsersMutation,
  useBulkEnableUsersMutation,
  useBulkDisableUsersMutation,
  useEnableUserMutation,
  useDisableUserMutation,
} from './queries';

const Users = () => {
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
  const fetchUsersQuery = useFetchUsersQuery({
    meta: {
      query: qs.stringify({
        paging: true,
        page,
        pageLength: rowsPerPage,
      }),
    },
  });
  const bulkDeleteUsersMutation = useBulkDeleteUsersMutation({
    onSuccess: () => {
      // Invalidate `useFetchUsersQuery`
      queryClient.invalidateQueries({ queryKey: API_USERS_QUERY_KEY });
    },
  });
  const bulkEnableUsersMutation = useBulkEnableUsersMutation({
    onSuccess: () => {
      // Invalidate `useFetchUsersQuery`
      queryClient.invalidateQueries({ queryKey: API_USERS_QUERY_KEY });
    },
  });
  const bulkDisableUsersMutation = useBulkDisableUsersMutation({
    onSuccess: () => {
      // Invalidate `useFetchUsersQuery`
      queryClient.invalidateQueries({ queryKey: API_USERS_QUERY_KEY });
    },
  });
  const enableUserMutation = useEnableUserMutation({
    onSuccess: () => {
      // Invalidate `useFetchUsersQuery`
      queryClient.invalidateQueries({ queryKey: API_USERS_QUERY_KEY });
    },
  });
  const disableUserMutation = useDisableUserMutation({
    onSuccess: () => {
      // Invalidate `useFetchUsersQuery`
      queryClient.invalidateQueries({ queryKey: API_USERS_QUERY_KEY });
    },
  });
  const portal = usePortalManager();
  const [colorMode] = useColorMode();
  const selectedRowCount = Object.keys(rowSelection).length;
  const isRowSelectionDisabled = fetchUsersQuery.isFetching;
  const isLoadingData = fetchUsersQuery.isFetching;
  const data = ensureArray(fetchUsersQuery.data?.records);
  const totalCount = fetchUsersQuery.data?.pagination?.totalRecords;
  const totalPages = Math.ceil(totalCount / rowsPerPage);

  const handleClickAdd = useCallback(() => {
    portal((close) => (
      <CreateUserDrawer
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
          bulkDeleteUsersMutation.mutate({ data });

          // Close the modal
          close();

          // Clear row selection
          clearRowSelection();
        }}
      />
    ));
  }, [portal, rowSelection, bulkDeleteUsersMutation, clearRowSelection]);

  const handleClickBulkEnable = useCallback(() => {
    const rowIds = Object.keys(rowSelection);
    const data = {
      ids: rowIds,
    };
    bulkEnableUsersMutation.mutate({ data });

    // Clear row selection
    clearRowSelection();
  }, [rowSelection, bulkEnableUsersMutation, clearRowSelection]);

  const handleClickBulkDisable = useCallback(() => {
    const rowIds = Object.keys(rowSelection);
    const data = {
      ids: rowIds,
    };
    bulkDisableUsersMutation.mutate({ data });

    // Clear row selection
    clearRowSelection();
  }, [rowSelection, bulkDisableUsersMutation, clearRowSelection]);

  const handleClickRefresh = useCallback(() => {
    fetchUsersQuery.refetch();
  }, [fetchUsersQuery]);

  const handleClickViewUserDetailsById = useCallback((id) => () => {
    portal((close) => (
      <UpdateUserDrawer
        id={id}
        onClose={close}
      />
    ));
  }, [portal]);

  const handleToggleStatusById = useCallback((id) => (event) => {
    const checked = event.currentTarget.checked;
    const mutation = checked ? enableUserMutation : disableUserMutation;
    mutation.mutate({
      meta: {
        id,
      },
    });
  }, [enableUserMutation, disableUserMutation]);

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
      header: i18n._('User Name'),
      cell: ({ row }) => (
        <OverflowTooltip label={row.original.title}>
          {({ ref, style }) => (
            <LinkButton
              onClick={handleClickViewUserDetailsById(row.original.id)}
              width="100%"
            >
              <Text ref={ref} {...style}>
                {row.original.title}
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
    handleClickViewUserDetailsById,
    handleToggleStatusById,
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
                  spin={fetchUsersQuery.isFetching}
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

export default Users;
