import isPropValid from '@emotion/is-prop-valid';
import styled from '@emotion/styled';
import {
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
  compose,
  system,
} from 'styled-system';
import { config } from './config';

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
  system(config),
);

const shouldForwardProp = (() => {
  const omittedPropNames = [
    ...styledSystemProps.propNames,

    // The `as` prop is supported by Emotion
    'as',
  ];
  const omittedPropMap = omittedPropNames
    .reduce((acc, val) => {
      acc[val] = true;
      return acc;
    }, {});
  return prop => isPropValid(prop) && !omittedPropMap[prop];
})();

const Box = styled('div', {
  shouldForwardProp,
})(styledSystemProps);

Box.displayName = 'Box';

export default Box;
