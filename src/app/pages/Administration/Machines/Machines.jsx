import { flexRender } from '@tanstack/react-table';
import { useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Collapse,
  Input,
  Dropdown,
  DropdownButton,
  Pagination,
  PaginationItem,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderRow,
  TableHeaderCell,
  TableRow,
  TableScrollbar,
  useTheme,
  Button,
  ButtonBase,
  Checkbox,
  Flex,
  Icon,
  LinkButton,
  OverflowTooltip,
  Text,
  Tooltip,
  usePortalManager,
} from '@tonic-ui/react';
import {
  RefreshIcon,
} from '@tonic-ui/react-icons';
import * as dateFns from 'date-fns';
import { ensureArray } from 'ensure-type';
import qs from 'qs';
import React, { Fragment, useCallback, useMemo, useState } from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import CodePreview from '@app/components/CodePreview';
import i18n from '@app/lib/i18n';
import useResourceTable from '../table/useResourceTable';
import { getPageNumber, ROWS_PER_PAGE_OPTIONS } from '../table/pagination';
import TableRowToggleIcon from '../components/TableRowToggleIcon';
import ConfirmBulkDeleteRecordsModal from '../modals/ConfirmBulkDeleteRecordsModal';
import CreateMachineDrawer from './drawers/CreateMachineDrawer';
import UpdateMachineDrawer from './drawers/UpdateMachineDrawer';
import {
  API_MACHINES_QUERY_KEY,
  useFetchMachinesQuery,
  useBulkDeleteMachinesMutation,
} from './queries';

/** @returns {JSX.Element} */
const Machines = () => {
  // pagination
  const rowsPerPageOptions = ROWS_PER_PAGE_OPTIONS;
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
  const selectedRowCount = Object.keys(rowSelection).length;
  const isRowSelectionDisabled = fetchMachinesQuery.isFetching;
  const isLoadingData = fetchMachinesQuery.isFetching;
  const data = ensureArray(fetchMachinesQuery.data?.records);
  const totalCount = fetchMachinesQuery.data?.pagination?.totalRecords ?? 0;
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
            inputProps={{ 'aria-label': i18n._('Select all rows') }}
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
            inputProps={{ 'aria-label': i18n._('Select row {{id}}', { id: row.id }) }}
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
            aria-label={i18n._('Toggle details for {{id}}', { id: row.id })}
            aria-expanded={isExpanded}
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
        const value = Number.isNaN(dt.getTime()) ? '-' : dateFns.format(dt, 'PPpp');

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
    const tableBorderColor = 'border.secondary';
    const dividerColor = 'border.secondary';
    const data = JSON.stringify(row.original.limits, null, 2);

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
              language="json"
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
  }, []);

  const theme = useTheme();
  const font = [theme.fontWeights.semibold, theme.fontSizes.sm, theme.fonts.base].join(' ');
  const { table, headerRef, setTableWidth } = useResourceTable({
    columns, data, rowSelection, onRowSelectionChange: setRowSelection, font,
  });
  const changePage = nextPage => {
    setPage(nextPage);
    clearRowSelection();
  };

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
              <ButtonBase
                aria-label={i18n._('Refresh')}
                border={1}
                borderColor="transparent"
                color="text.secondary"
                lineHeight={1}
                onClick={handleClickRefresh}
                px="2x"
                py="2x"
                transition="all .2s"
                sx={{
                  '&:focus': { color: 'text.secondary' },
                  '&:hover': { color: 'text.accent' },
                  '&:focus:hover': { color: 'text.accent' },
                  '&:active': { color: 'text.secondary' },
                  '&:focus:active': { color: 'text.secondary' },
                }}
              >
                <Icon
                  as={RefreshIcon}
                  spin={fetchMachinesQuery.isFetching}
                />
              </ButtonBase>
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
        <Box height="100%" overflow="hidden" position="relative">
          <AutoSizer onResize={({ width }) => setTableWidth(width)}>
            {({ width, height }) => (
              <Table layout="flexbox" sx={{ width, height }}>
                <TableHeader ref={headerRef} overflowX="hidden">
                  {table.getHeaderGroups().map(group => (
                    <TableHeaderRow key={group.id}>
                      {group.headers.map(header => (
                        <TableHeaderCell
                          key={header.id}
                          minWidth={header.column.columnDef.minSize}
                          width={header.getSize()}
                          {...header.column.columnDef.style}
                        >
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHeaderCell>
                      ))}
                    </TableHeaderRow>
                  ))}
                </TableHeader>
                {isLoadingData && (
                  <Flex
                    role="status" position="absolute" inset={0}
                    align="center" justify="center" backgroundColor="rgba(0, 0, 0, .7)"
                    zIndex={1}
                  >
                    <Spinner /><Text ml="2x">{i18n._('Loading...')}</Text>
                  </Flex>
                )}
                {fetchMachinesQuery.isError && (
                  <Flex
                    role="alert" align="center" justify="center"
                    gap="2x"
                  >
                    <Text>{i18n._('An unexpected error has occurred.')}</Text>
                    <Button onClick={() => fetchMachinesQuery.refetch()}>{i18n._('Retry')}</Button>
                  </Flex>
                )}
                {!isLoadingData && !fetchMachinesQuery.isError && data.length === 0 && (
                  <Flex align="center" justify="center" height="100%">{i18n._('No data to display')}</Flex>
                )}
                {table.getRowModel().rows.length > 0 && (
                  <TableScrollbar
                    height="100%" overflowY="auto" overflowX="auto"
                    onUpdate={({ scrollLeft }) => {
                      if (headerRef.current && headerRef.current.scrollLeft !== scrollLeft) {
                        headerRef.current.scrollLeft = scrollLeft;
                      }
                    }}
                  >
                    <TableBody>
                      {table.getRowModel().rows.map(row => (
                        <Fragment key={row.id}>
                          <TableRow
                            data-selected={row.getIsSelected() ? '' : undefined}
                            _hover={{ backgroundColor: 'actions.hovered' }}
                            _selected={{ backgroundColor: 'actions.selected' }}
                          >
                            {row.getVisibleCells().map(cell => (
                              <TableCell
                                key={cell.id} minWidth={cell.column.columnDef.minSize} width={cell.column.getSize()}
                                {...cell.column.columnDef.cellStyle}
                              >
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </TableCell>
                            ))}
                          </TableRow>
                          {row.getCanExpand() && (
                            <Collapse in={row.getIsExpanded()} unmountOnExit>
                              {renderExpandedRow({ row })}
                            </Collapse>
                          )}
                        </Fragment>
                      ))}
                    </TableBody>
                  </TableScrollbar>
                )}
              </Table>
            )}
          </AutoSizer>
        </Box>
      </Box>
      <Box flex="none">
        <Flex
          align="center" justify="flex-end" backgroundColor="background.high"
          color={totalCount === 0 ? 'text.disabled' : undefined}
          px="6x" py="3x" gap="2x"
        >
          <Text>{i18n._('Total: {{count}}', { count: totalCount })}</Text>
          <Dropdown
            placement="top"
            items={rowsPerPageOptions.map(option => ({
              value: option,
              content: option,
              props: {
                onClick: () => {
                  changePage(1); setRowsPerPage(option);
                },
              },
            }))}
            renderItem={item => item?.content}
            renderToggle={() => (
              <DropdownButton disabled={totalCount === 0} variant="ghost">
                {i18n._('{{rowsPerPage}} per page', { rowsPerPage })}
              </DropdownButton>
            )}
          />
          <Input
            aria-label={i18n._('Page')} disabled={totalCount === 0} width="10x"
            px={0} textAlign="center"
            value={page} onChange={event => changePage(getPageNumber(event.target.value, totalPages))}
          />
          <Text>/ {totalPages}</Text>
          <Pagination
            count={totalPages} page={page} disabled={totalCount === 0}
            onChange={changePage}
            slot={{ first: totalPages > 4, last: totalPages > 4 }}
            renderItem={item => ['first', 'previous', 'next', 'last'].includes(item.type) && (
              <PaginationItem
                {...item}
                aria-label={{
                  first: i18n._('Go to first page'),
                  previous: i18n._('Go to previous page'),
                  next: i18n._('Go to next page'),
                  last: i18n._('Go to last page'),
                }[item.type]}
              />
            )}
          />
        </Flex>
      </Box>
    </Flex>
  );
};

export default Machines;
