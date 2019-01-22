//
// Aspects of the grid system
//
// Bootstrap v3
// ------------------------------------------------------------------------------------------------
//                     |  Extra small            | Small    | Medium   | Large
//                     |  <768px                 | ≥768px   | ≥992px   | ≥1200px
// ------------------- | ----------------------- | ------------------------------------------------
// Grid behavior       | Horizontal at all times | Collapsed to start, horizontal above breakpoints
// ------------------- | ----------------------- | ------------------------------------------------
// Max container width | None (auto)             | 750px    | 970px    | 1170px
// ------------------- | --------------------------------------------------------------------------
// Gutter width        | 30px (15px on each side of a column)
// ------------------------------------------------------------------------------------------------
//
// Bootstrap v4
// ------------------------------------------------------------------------------------------------
//                     |  Extra small            | Small    | Medium   | Large    | Extra large
//                     |  <576px                 | ≥576px   | ≥768px   | ≥992px   | ≥1200px
// ------------------- | ----------------------- | ------------------------------------------------
// Grid behavior       | Horizontal at all times | Collapsed to start, horizontal above breakpoints
// ------------------- | ----------------------- | ------------------------------------------------
// Max container width | None (auto)             | 540px    | 720px    | 960px    | 1140px
// ------------------- | --------------------------------------------------------------------------
// Gutter width        | 30px (15px on each side of a column)
// ------------------------------------------------------------------------------------------------
//

export const LAYOUT_FLEXBOX = 'flexbox';
export const LAYOUT_FLOATS = 'floats';
export const LAYOUTS = [
    LAYOUT_FLEXBOX,
    LAYOUT_FLOATS,
];

export const SCREEN_CLASSES = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];

// The default breakpoints (minimum width) of devices in screen class sm, md, lg, xl, and xxl.
export const DEFAULT_BREAKPOINTS = [576, 768, 992, 1200, 0];

// The default container widths in pixels of devices in screen class sm, md, lg, xl, and xxl.
export const DEFAULT_CONTAINER_WIDTHS = [540, 720, 960, 1140, 0];

// The default number of columns.
export const DEFAULT_COLUMNS = 12;

// The default horizontal padding (called gutter) between two columns. A gutter width of 30 means 15px on each side of a column.
export const DEFAULT_GUTTER_WIDTH = 30;

// The default grid system layout.
export const DEFAULT_LAYOUT = LAYOUT_FLEXBOX;
