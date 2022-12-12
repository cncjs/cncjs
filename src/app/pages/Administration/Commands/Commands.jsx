import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Box,
  Checkbox,
  Table,
  TableHeader,
  TableHeaderRow,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  Truncate,
} from '@tonic-ui/react';
import React, { useMemo, useState } from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import i18n from 'app/lib/i18n';

/*
const getCalculatedColumns = ({ initColumns, tableWidth }) => {
  const columns = initColumns.map(column => {
    let columnWidth = column.width;
    if (typeof columnWidth === 'string') {
      const lastChar = columnWidth.substr(columnWidth.length - 1);
      if (lastChar === '%') {
        columnWidth = tableWidth * (parseFloat(columnWidth) / 100);
        return {
          ...column,
          width: columnWidth
        };
      }
      if (columnWidth === 'auto') {
        return {
          ...column,
          width: 0
        };
      }
    }
    return column;
  });
  const customWidthColumns = columns.filter(column => !!column.width);
  const totalCustomWidth = customWidthColumns.reduce((accumulator, column) => accumulator + column.width, 0);
  let defaultCellWidth = (tableWidth - totalCustomWidth) / (columns.length - customWidthColumns.length);
  defaultCellWidth = defaultCellWidth <= 0 ? 150 : defaultCellWidth;
  return columns.map(column => {
    if (!!column.width) {
      return column;
    }
    return {
      ...column,
      width: defaultCellWidth
    };
  });
};
*/

const data = [
  { id: 1, enabled: true, title: 'G28', mtime: '2020-01-01 00:00:00' },
  { id: 2, enabled: true, title: 'G29', mtime: '2020-01-01 00:00:00' },
  { id: 3, enabled: true, title: 'G30', mtime: '2020-01-01 00:00:00' },
  { id: 4, enabled: true, title: 'G31', mtime: '2020-01-01 00:00:00' },
  { id: 5, enabled: true, title: 'G32', mtime: '2020-01-01 00:00:00' },
  { id: 6, enabled: true, title: 'G33', mtime: '2020-01-01 00:00:00' },
];

const Resizer = (props) => {
  return (
    <Box
      position="absolute"
      right="-1x"
      top={0}
      bottom={0}
      width="2x"
      backgroundColor="transparent"
      cursor="col-resize"
      userSelect="none"
      touchAction="none"
      zIndex={1}
      {...props}
    />
  );
};

const Commands = () => {
  const columns = useMemo(() => ([
    {
      id: 'selection',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllRowsSelected()}
          indeterminate={table.getIsSomeRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
          mt="1h"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          indeterminate={row.getIsSomeSelected()}
          onChange={row.getToggleSelectedHandler()}
          mt="1h"
        />
      ),
      enableResizing: false,
      size: 40 + 1, // including the right border width
    },
    {
      header: (
        i18n._('Description')
      ),
      accessorKey: 'title',
    },
    {
      header: (
        i18n._('Enabled')
      ),
      accessorKey: 'enabled',
    },
    {
      header: (
        i18n._('Last Modified')
      ),
      accessorKey: 'mtime',
      enableResizing: false,
    },
  ]), []);
  const [rowSelection, setRowSelection] = useState({});
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: {
      rowSelection,
    },
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    onRowSelectionChange: setRowSelection,
  });

  return (
    <Box
      p="4x"
      height="100%"
    >
      <AutoSizer>
        {({ width: containerWidth, height: containerHeight }) => {
          return (
            <Table
              variant="outline"
              width={containerWidth}
            >
              <TableHeader>
                {table.getHeaderGroups().map(headerGroup => (
                  <TableHeaderRow id={headerGroup.id}>
                    {headerGroup.headers.map(header => {
                      const cellWidth = (header.column.id === 'mtime')
                        ? containerWidth - header.getStart()
                        : header.getSize();

                      return (
                        <TableHeaderCell
                          key={header.id}
                          style={{
                            position: 'relative',
                            width: cellWidth,
                          }}
                        >
                          {header.isPlaceholder ? null : (
                            <Truncate>
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                            </Truncate>
                          )}
                          {header.column.getCanResize() && (
                            <Resizer
                              onMouseDown={header.getResizeHandler()}
                              onTouchStart={header.getResizeHandler()}
                              style={{
                                opacity: header.column.getIsResizing() ? 1 : 0,
                              }}
                            />
                          )}
                        </TableHeaderCell>
                      );
                    })}
                  </TableHeaderRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map(row => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map(cell => {
                      const cellWidth = (cell.column.id === 'mtime')
                        ? containerWidth - cell.column.getStart()
                        : cell.column.getSize();

                      return (
                        <TableCell
                          key={cell.id}
                          style={{
                            width: cellWidth,
                          }}
                        >
                          <Truncate>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </Truncate>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          );
        }}
      </AutoSizer>
    </Box>
  );
};

export default Commands;
