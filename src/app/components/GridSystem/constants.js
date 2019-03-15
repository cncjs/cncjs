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
export const DEFAULT_GUTTER_WIDTH = 0;

// The default grid system layout.
export const DEFAULT_LAYOUT = LAYOUT_FLEXBOX;
