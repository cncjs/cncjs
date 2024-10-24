import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Box,
  Collapse,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderRow,
  TableHeaderCell,
  TableRow,
  TableScrollbar,
  useColorMode,
  useTheme,
} from '@tonic-ui/react';
import { dataAttr, runIfFn } from '@tonic-ui/utils';
import React, {
  Fragment,
  forwardRef,
  useEffect,
  useRef,
  useState,
} from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import i18n from '@app/lib/i18n';
import EmptyData from './EmptyData';
import Overlay from './Overlay';

/**
 * Uses canvas.measureText to compute and return the width of the given text of given font in pixels.
 *
 * @param {String} text The text to be rendered.
 * @param {String} font The css font descriptor that text is to be rendered with (e.g. "bold 14px verdana").
 *
 * @see https://stackoverflow.com/questions/118241/calculate-text-width-with-javascript/21015393#21015393
 */
const getTextWidth = (text, font) => {
  // re-use canvas object for better performance
  const canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement('canvas'));
  const context = canvas.getContext('2d');
  context.font = font;
  const metrics = context.measureText(text);
  return metrics.width || 0;
};

const defaultLabelEmptyData = () => {
  return i18n._('No data to display');
};

const BaseTable = forwardRef((
  {
    isLoading,
    columns,
    data,
    variant = 'default', // One of: 'default', 'outline'
    renderExpandedRow,
    enableRowSelection: enableRowSelectionProp = false,
    rowSelection: rowSelectionProp,
    onRowSelectionChange: onRowSelectionChangeProp,
    labelEmptyData = defaultLabelEmptyData,
    ...rest
  },
  ref,
) => {
  const tableHeaderRef = useRef();
  const [colorMode] = useColorMode();
  const theme = useTheme();
  const hoverBackgroundColor = {
    dark: 'rgba(255, 255, 255, 0.12)',
    light: 'rgba(0, 0, 0, 0.12)',
  }[colorMode];
  const selectedBackgroundColor = {
    dark: 'rgba(255, 255, 255, 0.08)',
    light: 'rgba(0, 0, 0, 0.08)',
  }[colorMode];

  const table = useReactTable({
    data,
    columns,
    defaultColumn: {
      minSize: 80,
    },
    state: {
      rowSelection: rowSelectionProp,
    },
    enableRowSelection: enableRowSelectionProp,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
    getRowId: (originalRow, index) => {
      // Identify individual rows that are originating from any server-side operation
      return originalRow.id;
    },
    onRowSelectionChange: onRowSelectionChangeProp,
  });

  const [tableWidth, setTableWidth] = useState(0);

  useEffect(() => {
    if (!tableWidth) {
      return;
    }

    const gutterWidth = 12 + 12; // 12px padding on each side of the cell
    const tableHeaderCellFont = [
      theme.fontWeights.semibold,
      theme.fontSizes.sm,
      theme.fonts.base,
    ].join(' '); // => '600 14px "Segoe UI",-apple-system,BlinkMacSystemFont,"Helvetica Neue",Helvetica,Arial,sans-serif'
    const getColumnHeaderTextWidth = (text) => getTextWidth(text, tableHeaderCellFont);

    // Fixed columns are columns with a fixed size (e.g. 100 or '10%')
    const fixedColumns = table.getAllColumns()
      .filter(column => column.columnDef.size !== 'auto')
      .map(column => {
        const { id, columnDef } = column;
        const { minSize, size } = columnDef;

        // If the column size is a number, return the original size value
        if (typeof size === 'number') {
          return {
            id,
            size,
          };
        }

        // If the column size is a percentage, return the computed size value
        if (typeof size === 'string' && size.endsWith('%')) {
          const textWidth = getColumnHeaderTextWidth(columnDef.header);
          const percentageWidth = tableWidth * parseFloat(size) / 100;

          return {
            id,
            size: Math.max(
              percentageWidth, // percentage of table width
              textWidth + gutterWidth, // text width with padding
              minSize, // minimum size (e.g. 40px)
            ),
          };
        }

        // Otherwise, return the minimum size value
        return {
          id,
          size: minSize,
        };
      });

    // Flexible columns are columns with a flexible size (e.g. 'auto')
    const flexColumns = table.getAllColumns()
      .filter(column => column.columnDef.size === 'auto')
      .map(column => {
        const { id, columnDef } = column;
        const { minSize } = columnDef;
        const textWidth = getColumnHeaderTextWidth(columnDef.header);

        return {
          id,
          size: Math.max(
            textWidth + gutterWidth, // text width with padding
            minSize, // minimum size (e.g. 40px)
          ),
        };
      });

    const totalFixedColumnSize = fixedColumns.reduce((acc, column) => acc + column.size, 0);
    const totalFlexColumnSize = flexColumns.reduce((acc, column) => acc + column.size, 0);

    let extraSpaceLeft = tableWidth - totalFixedColumnSize;

    // Distribute extra space to fixed columns if flex columns are not present
    if ((flexColumns.length === 0) && (extraSpaceLeft > 0)) {
      const extraSpacePerColumn = extraSpaceLeft / fixedColumns.length;
      fixedColumns.forEach(column => {
        column.size += extraSpacePerColumn;
      });
      extraSpaceLeft = 0;
    }

    // Distribute extra space to flex columns if flex columns are present
    if ((flexColumns.length > 0) && (extraSpaceLeft > totalFlexColumnSize)) {
      /**
       * Assume that the extra space is 500px and the total flex column size is 400px:
       * > extraSpaceLeft = 500
       * > flexColumns = [ { size: 250 }, { size: 150 } ] // => Total size: 400px
       *
       * Iteration #0:
       * > column.size = Math.max(500 / (2 - 0), 250) = Math.max(250, 250) = 250
       * > extraSpaceLeft = 500 - 250 = 250
       *
       * Iteration #1:
       * > column.size = Math.max(250 / (2 - 1), 150) = Math.max(250, 150) = 250
       * > extraSpaceLeft = 250 - 250 = 0
       */
      flexColumns.forEach((column, index) => {
        column.size = Math.max(
          extraSpaceLeft / (flexColumns.length - index),
          column.size,
        );
        extraSpaceLeft -= column.size;
      });
    }

    const columnSizing = {};

    for (let i = 0; i < fixedColumns.length; i++) {
      const column = fixedColumns[i];
      columnSizing[column.id] = column.size;
    }
    for (let i = 0; i < flexColumns.length; i++) {
      const column = flexColumns[i];
      columnSizing[column.id] = column.size;
    }

    table.setColumnSizing(columnSizing);
  }, [columns, table, tableWidth, theme]);

  return (
    <Box
      ref={ref}
      sx={{
        height: '100%',
        overflow: 'hidden',
      }}
      {...rest}
    >
      <AutoSizer
        onResize={({ width }) => {
          if (tableWidth !== width) {
            setTableWidth(width);
          }
        }}
      >
        {({ width, height }) => (
          <Table
            layout="flexbox"
            variant={variant}
            sx={{
              height,
              width,
            }}
          >
            <TableHeader
              ref={tableHeaderRef}
              sx={{
                overflowX: 'hidden', // Enable programmatic control of the scroll position
              }}
            >
              {table.getHeaderGroups().map(headerGroup => (
                <TableHeaderRow key={headerGroup.id}>
                  {headerGroup.headers.map(header => {
                    const styleProps = {
                      minWidth: header.column.columnDef.minSize,
                      width: header.getSize(),
                      ...header.column.columnDef.style,
                    };
                    return (
                      <TableHeaderCell
                        key={header.id}
                        {...styleProps}
                      >
                        {header.isPlaceholder ? null : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}
                      </TableHeaderCell>
                    );
                  })}
                </TableHeaderRow>
              ))}
            </TableHeader>
            {isLoading && (
              <Overlay>
                <Spinner />
              </Overlay>
            )}
            {table.getRowModel().rows.length === 0 && (
              <EmptyData>
                {runIfFn(labelEmptyData)}
              </EmptyData>
            )}
            {(table.getRowModel().rows.length > 0) && (
              <TableScrollbar
                height="100%"
                overflowY="visible" // Display vertical scrollbar when content overflows
                overflowX="auto" // Display horizontal scrollbar when content overflows and is interacted with
                onUpdate={({ scrollLeft }) => {
                  if (tableHeaderRef.current && tableHeaderRef.current.scrollLeft !== scrollLeft) {
                    tableHeaderRef.current.scrollLeft = scrollLeft;
                  }
                }}
              >
                <TableBody>
                  {table.getRowModel().rows.map(row => (
                    <Fragment key={row.id}>
                      <TableRow
                        data-selected={dataAttr(row.getIsSelected())}
                        _hover={{
                          backgroundColor: hoverBackgroundColor,
                        }}
                        _selected={{
                          backgroundColor: selectedBackgroundColor,
                        }}
                      >
                        {row.getVisibleCells().map(cell => {
                          const styleProps = {
                            minWidth: cell.column.columnDef.minSize,
                            width: cell.column.getSize(),
                            ...cell.column.columnDef.cellStyle,
                          };
                          return (
                            <TableCell
                              key={cell.id}
                              {...styleProps}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                      {row.getCanExpand() && (
                        <Collapse
                          in={row.getIsExpanded()}
                          unmountOnExit
                        >
                          {typeof renderExpandedRow === 'function' && renderExpandedRow({ row })}
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
  );
});

export default BaseTable;
