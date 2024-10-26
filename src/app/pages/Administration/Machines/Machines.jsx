import { useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Checkbox,
  Flex,
  Icon,
  LinkButton,
  OverflowTooltip,
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
import CreateMachineDrawer from './drawers/CreateMachineDrawer';
import UpdateMachineDrawer from './drawers/UpdateMachineDrawer';
import {
  API_MACHINES_QUERY_KEY,
  useFetchMachinesQuery,
  useBulkDeleteMachinesMutation,
} from './queries';

const Machines = () => {
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
  const fetchMachinesQuery = useFetchMachinesQuery({
    meta: {
      query: qs.stringify({
        paging: true,
        page,
        pageLength: rowsPerPage,
      }),
    },
  });
  const bulkDeleteMachinesMutation = useBulkDeleteMachinesMutation({
    onSuccess: () => {
      // Invalidate `useFetchMachinesQuery`
      queryClient.invalidateQueries({ queryKey: API_MACHINES_QUERY_KEY });
    },
  });
  const portal = usePortalManager();
  const [colorMode] = useColorMode();
  const selectedRowCount = Object.keys(rowSelection).length;
  const isRowSelectionDisabled = fetchMachinesQuery.isFetching;
  const isLoadingData = fetchMachinesQuery.isFetching;
  const data = ensureArray(fetchMachinesQuery.data?.records);
  const totalCount = fetchMachinesQuery.data?.pagination?.totalRecords;
  const totalPages = Math.ceil(totalCount / rowsPerPage);

  const handleClickAdd = useCallback(() => {
    portal((close) => (
      <CreateMachineDrawer
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
          bulkDeleteMachinesMutation.mutate({ data });

          // Close the modal
          close();

          // Clear row selection
          clearRowSelection();
        }}
      />
    ));
  }, [portal, rowSelection, bulkDeleteMachinesMutation, clearRowSelection]);

  const handleClickRefresh = useCallback(() => {
    fetchMachinesQuery.refetch();
  }, [fetchMachinesQuery]);

  const handleClickViewMachineDetailsById = useCallback((id) => () => {
    portal((close) => (
      <UpdateMachineDrawer
        id={id}
        onClose={close}
      />
    ));
  }, [portal]);

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
      minSize: 24,
      size: 24,
    },
    {
      header: i18n._('Machine Name'),
      cell: ({ row }) => (
        <OverflowTooltip label={row.original.name}>
          {({ ref, style }) => (
            <LinkButton
              onClick={handleClickViewMachineDetailsById(row.original.id)}
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
  ]), [
    isRowSelectionDisabled,
    handleClickViewMachineDetailsById,
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
    const data = row.original.content;

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
                  spin={fetchMachinesQuery.isFetching}
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

export default Machines;
