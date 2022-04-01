import memoize from 'micro-memoize';
import React from 'react';
import {
  DEFAULT_SPACING_X,
  DEFAULT_SPACING_Y,
} from './constants';
import { CardContext } from './context';

const getMemoizedState = memoize(state => ({ ...state }));

function Provider({
  borderColor,
  borderRadius,
  borderWidth,
  spacingX = DEFAULT_SPACING_X, // need to specify the default value
  spacingY = DEFAULT_SPACING_Y, // need to specify the default value
  children,
}) {
  const value = getMemoizedState({
    borderColor,
    borderRadius,
    borderWidth,
    spacingX,
    spacingY,
  });

  return (
    <CardContext.Provider value={value}>
      {children}
    </CardContext.Provider>
  );
}

export default Provider;
