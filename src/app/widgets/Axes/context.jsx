import React, { createContext, useContext } from 'react';

export const AxesContext = createContext(null);

/**
 * @param {{ value: object, children?: React.ReactNode }} props
 * @returns {JSX.Element}
 */
export function AxesProvider({ value, children }) {
  return <AxesContext.Provider value={value}>{children}</AxesContext.Provider>;
}

/**
 * @returns {object}
 */
export function useAxes() {
  const context = useContext(AxesContext);

  if (!context) {
    throw new Error('useAxes must be used within AxesProvider');
  }

  return context;
}
