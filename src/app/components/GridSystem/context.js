import React from 'react';
import {
    DEFAULT_BREAKPOINTS,
    DEFAULT_CONTAINER_WIDTHS,
    DEFAULT_COLUMNS,
    DEFAULT_GUTTER_WIDTH,
    DEFAULT_LAYOUT,
} from './constants';

export const ConfigurationContext = React.createContext({
    breakpoints: DEFAULT_BREAKPOINTS,
    containerWidths: DEFAULT_CONTAINER_WIDTHS,
    columns: DEFAULT_COLUMNS,
    gutterWidth: DEFAULT_GUTTER_WIDTH,
    layout: DEFAULT_LAYOUT,
});

export const ScreenClassContext = React.createContext(null);
