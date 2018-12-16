import ensureArray from 'ensure-array';
import {
    DEFAULT_BREAKPOINTS
} from './constants';

export const getViewportWidth = () => {
    if (typeof window !== 'undefined' && window.innerWidth) {
        return window.innerWidth;
    }
    return null;
};

export const getScreenClass = ({ breakpoints }) => {
    breakpoints = ensureArray(breakpoints);
    if (breakpoints.length === 0) {
        breakpoints = DEFAULT_BREAKPOINTS;
    }

    let screenClass = 'xs';

    const viewportWidth = getViewportWidth();

    if (breakpoints[0] && (viewportWidth >= breakpoints[0]) && (breakpoints[0] > 0)) {
        screenClass = 'sm';
    }
    if (breakpoints[1] && (viewportWidth >= breakpoints[1]) && (breakpoints[1] > 0)) {
        screenClass = 'md';
    }
    if (breakpoints[2] && (viewportWidth >= breakpoints[2]) && (breakpoints[2] > 0)) {
        screenClass = 'lg';
    }
    if (breakpoints[3] && (viewportWidth >= breakpoints[3]) && (breakpoints[3] > 0)) {
        screenClass = 'xl';
    }
    if (breakpoints[4] && (viewportWidth >= breakpoints[4]) && (breakpoints[4] > 0)) {
        screenClass = 'xxl';
    }

    return screenClass;
};
