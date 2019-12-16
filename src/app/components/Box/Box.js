import styled from '@emotion/styled';
import {
    compose,
    background,
    border,
    color,
    flexbox,
    grid,
    layout,
    position,
    shadow,
    space,
    typography,
} from 'styled-system';

const styledSystemProps = compose(
    background,
    border,
    color,
    flexbox,
    grid,
    layout,
    position,
    shadow,
    space,
    typography,
);

const shouldForwardProp = (() => {
    const combinedPropNames = [
        ...styledSystemProps.propNames,
        'as',
        'd',
        'textDecoration',
        'pointerEvents',
        'visibility',
        'transform',
        'cursor',
        'fill',
        'stroke',
    ];
    const omittedPropName = combinedPropNames.reduce((acc, val) => {
        acc[val] = true;
        return acc;
    }, {});

    return prop => !omittedPropName[prop];
})();

const Box = styled('div', {
    shouldForwardProp: prop => shouldForwardProp(prop),
})(styledSystemProps);

Box.displayName = 'Box';

export default Box;
