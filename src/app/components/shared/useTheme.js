import { ThemeContext } from '@emotion/core';
import { useContext } from 'react';

const useTheme = () => {
    if (!useContext) {
        throw new Error('The useContext hook is not available with your React version');
    }

    const theme = useContext(ThemeContext);
    if (theme === undefined) {
        throw new Error('useTheme must be called within ThemeProvider');
    }

    return theme;
};

export default useTheme;
