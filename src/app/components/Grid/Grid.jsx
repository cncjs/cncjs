import React, { forwardRef } from 'react';
import Box from '../Box';

const Grid = forwardRef((
  {
    gap,
    rowGap,
    columnGap,
    column,
    row,
    area,
    autoFlow,
    autoRows,
    autoColumns,
    templateRows,
    templateColumns,
    templateAreas,
    ...props
  },
  ref,
) => (
  <Box
    ref={ref}
    display="grid"
    gridGap={gap}
    gridRowGap={rowGap}
    gridColumnGap={columnGap}
    gridColumn={column}
    gridRow={row}
    gridArea={area}
    gridAutoFlow={autoFlow}
    gridAutoRows={autoRows}
    gridAutoColumns={autoColumns}
    gridTemplateRows={templateRows}
    gridTemplateColumns={templateColumns}
    gridTemplateAreas={templateAreas}
    {...props}
  />
));

Grid.displayName = 'Grid';

export default Grid;
