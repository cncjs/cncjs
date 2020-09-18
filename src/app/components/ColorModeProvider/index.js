import PropTypes from 'prop-types';
import React, { useCallback, useEffect, useRef, useState } from 'react';

const initialColorMode = 'light';
const ColorModeContext = React.createContext(initialColorMode);
const ColorModeSetterContext = React.createContext({});

const ColorModeProvider = ({
  value = initialColorMode,
  children,
}) => {
  const [colorMode, setColorMode] = useState(value);
  useEffect(() => {
    setColorMode(value);
  }, [value]);
  const toggleColorMode = useCallback(() => {
    setColorMode(prevColorMode => {
      const nextColorMode = {
        'light': 'dark', // light -> dark
        'dark': 'light', // dark -> light
      }[prevColorMode] || initialColorMode;
      return nextColorMode;
    });
  }, []);

  const colorModeSetterRef = useRef({
    setColorMode,
    toggleColorMode,
  });

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ColorModeSetterContext.Provider value={colorModeSetterRef.current}>
        {children}
      </ColorModeSetterContext.Provider>
    </ColorModeContext.Provider>
  );
};

ColorModeProvider.propTypes = {
  value: PropTypes.oneOf(['light', 'dark']),
};

export default ColorModeProvider;
export { ColorModeContext, ColorModeSetterContext };
