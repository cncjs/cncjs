/** Distribute measured header widths while retaining fixed, percentage and auto column sizes. */
export const getColumnSizing = (columns, tableWidth, measureText) => {
  const gutterWidth = 12 + 12; // 12px padding on each side of the cell
  const getColumnHeaderTextWidth = (text) => measureText(text);

  // Fixed columns are columns with a fixed size (e.g. 100 or '10%')
  const fixedColumns = columns
    .filter(column => column.size !== 'auto')
    .map(column => {
      const { id } = column;
      const columnDef = column;
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
  const flexColumns = columns
    .filter(column => column.size === 'auto')
    .map(column => {
      const { id } = column;
      const columnDef = column;
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

  return columnSizing;
};
