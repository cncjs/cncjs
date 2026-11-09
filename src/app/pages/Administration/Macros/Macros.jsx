import { flexRender } from '@tanstack/react-table';
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
  Divider,
  Flex,
  Icon,
  LinkButton,
  OverflowTooltip,
  Stack,
  Text,
  TextLabel,
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
import {
  useFetchMacrosQuery,
  useBulkDeleteMacrosMutation,
} from '@app/queries/macros';
import { getPageNumber, ROWS_PER_PAGE_OPTIONS } from '../table/pagination';
import useResourceTable from '../table/useResourceTable';
import TableRowToggleIcon from '../components/TableRowToggleIcon';
import ConfirmBulkDeleteRecordsModal from '../modals/ConfirmBulkDeleteRecordsModal';
import CreateMacroDrawer from './drawers/CreateMacroDrawer';
import UpdateMacroDrawer from './drawers/UpdateMacroDrawer';

/** @returns {JSX.Element} */
const Macros = () => {
  // pagination
  const rowsPerPageOptions = ROWS_PER_PAGE_OPTIONS;
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(rowsPerPageOptions[0]);

  // row selection
  const [rowSelection, setRowSelection] = useState({});
  const clearRowSelection = useCallback(() => {
    setRowSelection({});
  }, []);

  // manual refresh
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchMacrosQuery = useFetchMacrosQuery({
    meta: {
      query: qs.stringify({
        paging: true,
        page,
        pageLength: rowsPerPage,
      }),
    },
  });
  const bulkDeleteMacrosMutation = useBulkDeleteMacrosMutation();
  const portal = usePortalManager();
  const selectedRowCount = Object.keys(rowSelection).length;
  const isRowSelectionDisabled = fetchMacrosQuery.isFetching;
  // Show the full-table loading overlay for the initial fetch and explicit
  // refreshes only; background fetches (e.g. mutation invalidations) keep the
  // rendered records visible. React Query v4 `isLoading` means "no data yet".
  const isLoadingData = fetchMacrosQuery.isLoading || isRefreshing;
  const data = ensureArray(fetchMacrosQuery.data?.records);
  const totalCount = fetchMacrosQuery.data?.pagination?.totalRecords ?? 0;
  const totalPages = Math.ceil(totalCount / rowsPerPage);

  const handleClickAdd = useCallback(() => {
    portal((close) => (
      <CreateMacroDrawer
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
          bulkDeleteMacrosMutation.mutate({ data });

          // Close the modal
          close();

          // Clear row selection
          clearRowSelection();
        }}
      />
    ));
  }, [portal, rowSelection, bulkDeleteMacrosMutation, clearRowSelection]);

  const handleClickRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Join an in-flight fetch instead of cancelling it so the overlay stays
      // visible until the request settles, whether it succeeds or fails.
      await fetchMacrosQuery.refetch({ cancelRefetch: false });
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchMacrosQuery]);

  const handleClickViewMacroDetailsById = useCallback((id) => () => {
    portal((close) => (
      <UpdateMacroDrawer
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
      minSize: 48,
      size: 48,
    },
    {
      header: i18n._('Macro Name'),
      cell: ({ row }) => {
        const value = row.original.name;

        return (
          <OverflowTooltip label={value}>
            {({ ref, style }) => (
              <LinkButton
                onClick={handleClickViewMacroDetailsById(row.original.id)}
                width="100%"
              >
                <Text ref={ref} {...style}>
                  {value}
                </Text>
              </LinkButton>
            )}
          </OverflowTooltip>
        );
      },
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
    handleClickViewMacroDetailsById,
  ]);

  const renderExpandedRow = useCallback(({ row }) => {
    const tableBorderColor = 'border.secondary';
    const dividerColor = 'border.secondary';
    const value = row.original.action;

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
          <Stack width="100%">
            <Flex
              alignItems="center"
              px="4x"
            >
              <TextLabel my="3x">
                {i18n._('Macro Action')}
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
            </Flex>
            <CodePreview
              data={value}
              language="shell"
              style={{
                padding: 16,
                width: '100%',
                maxHeight: 180,
                overflowY: 'auto',
              }}
            />
          </Stack>
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
                  spin={fetchMacrosQuery.isFetching}
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
                {fetchMacrosQuery.isError && (
                  <Flex
                    role="alert" align="center" justify="center"
                    gap="2x"
                  >
                    <Text>{i18n._('An unexpected error has occurred.')}</Text>
                    <Button onClick={handleClickRefresh}>{i18n._('Retry')}</Button>
                  </Flex>
                )}
                {!isLoadingData && !fetchMacrosQuery.isError && data.length === 0 && (
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

export default Macros;
