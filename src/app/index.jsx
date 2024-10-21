import { library } from '@fortawesome/fontawesome-svg-core';
import { fab } from '@fortawesome/free-brands-svg-icons';
import { far } from '@fortawesome/free-regular-svg-icons';
import { fas } from '@fortawesome/free-solid-svg-icons';
import React from 'react';
import ReactDOM from 'react-dom';
import App from '@app/containers/app';
import rootSaga from '@app/sagas';
import sagaMiddleware from '@app/store/redux/sagaMiddleware';
import { GlobalProvider } from '@app/context';
import './styles/vendor.styl';

// Hot Module Replacement
if (import.meta.webpackHot) {
  const errorHandler = (err, { moduleId, module }) => {
    console.error('errorHandler:', err, moduleId, module);
  };
  import.meta.webpackHot.accept(errorHandler);
}

// Font Awesome icons
library.add(fab);
library.add(far);
library.add(fas);

const container = document.createElement('div');
container.id = 'viewport';
document.body.appendChild(container);

sagaMiddleware.run(rootSaga);

const root = ReactDOM.createRoot(container);
root.render(
  <GlobalProvider>
    <App />
  </GlobalProvider>
);
