import { Global, css } from '@emotion/core';
import {
  Box,
  CSSBaseline,
  useColorMode,
  useTheme,
} from '@trendmicro/react-styled-ui';
import React from 'react';
import ReactDOM from 'react-dom';
import App from 'app/containers/App';
import rootSaga from 'app/sagas';
import sagaMiddleware from 'app/store/redux/sagaMiddleware';
import { GlobalProvider } from 'app/context';
import './styles/vendor.styl';
import './styles/app.styl';

const container = document.createElement('div');
document.body.appendChild(container);

// Run saga middleware
sagaMiddleware.run(rootSaga);

const Layout = (props) => {
  const { colorMode } = useColorMode();
  const { fontSizes, lineHeights } = useTheme();
  const backgroundColor = {
    light: 'white',
    dark: 'gray:100',
  }[colorMode];
  const color = {
    light: 'black:primary',
    dark: 'white:primary',
  }[colorMode];

  return (
    <>
      <Global
        styles={css`
          body {
            font-size: ${fontSizes.sm};
            line-height: ${lineHeights.sm};
          }
        `}
      />
      <Box
        backgroundColor={backgroundColor}
        color={color}
        fontSize="sm"
        lineHeight="sm"
        {...props}
      />
    </>
  );
};

ReactDOM.render(
  <GlobalProvider>
    <CSSBaseline />
    <Layout>
      <App />
    </Layout>
  </GlobalProvider>,
  container
);
