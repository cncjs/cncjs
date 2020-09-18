import { useReducer } from 'react';
import { createContainer } from 'react-tracked';

export const {
  Provider,
  useTracked,
} = createContainer(({ reducer, initialState }) => useReducer(reducer, initialState));
