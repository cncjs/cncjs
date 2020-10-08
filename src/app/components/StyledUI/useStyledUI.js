import {
  useTheme,
  useColorMode,
} from '@trendmicro/react-styled-ui';
import _get from 'lodash/get';
import _isEqual from 'lodash/isEqual';
import memoize from 'micro-memoize';
import { useContext } from 'react';
import { StyledUIContext } from './context';

const getMemoizedHandlers = memoize(({
  theme,
  colorMode,
  colorStyles,
  layoutStyles,
}) => {
  const getColorStyle = (key, defaultValue) => {
    if (Array.isArray(key)) {
      key = [colorMode].concat(key);
    } else {
      key = `${colorMode}.${key}`;
    }

    const value = _get(colorStyles, key, defaultValue);
    const colorValue = _get(theme, `colors.${value}`);

    return colorValue ?? value;
  };

  const getLayoutStyle = (key, defaultValue) => {
    const value = _get(layoutStyles, key, defaultValue);
    const spaceValue = _get(theme, `space.${value}`);
    const sizeValue = _get(theme, `sizes.${value}`);

    return (spaceValue ?? sizeValue) ?? value;
  };

  return {
    getColorStyle,
    getLayoutStyle,
  };
}, { isEqual: _isEqual });

const useStyledUI = (options) => {
  const { context: Context = StyledUIContext } = { ...options };
  const context = useContext(Context);

  if (!context) {
    throw new Error('The `useStyledUI` hook must be called from a descendent of the `StyledUIProvider`.');
  }

  const { colorStyles, layoutStyles } = { ...context };
  const theme = useTheme();
  const { colorMode, setColorMode, toggleColorMode } = useColorMode();
  const { getColorStyle, getLayoutStyle } = getMemoizedHandlers({
    theme,
    colorMode,
    colorStyles,
    layoutStyles,
  });

  return {
    theme,
    colorMode,
    setColorMode,
    toggleColorMode,
    colorStyles,
    layoutStyles,
    getColorStyle,
    getLayoutStyle,
  };
};

export default useStyledUI;
