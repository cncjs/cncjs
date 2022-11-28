import { library } from '@fortawesome/fontawesome-svg-core';
import { fab } from '@fortawesome/free-brands-svg-icons';
import { far } from '@fortawesome/free-regular-svg-icons';
import { fas } from '@fortawesome/free-solid-svg-icons';
import React from 'react';
import ReactDOM from 'react-dom';
import App from 'app/containers/App';
import rootSaga from 'app/sagas';
import sagaMiddleware from 'app/store/redux/sagaMiddleware';
import { GlobalProvider } from 'app/context';
import './styles/vendor.styl';

// Font Awesome icons
library.add(fab);
library.add(far);
library.add(fas);

const container = document.createElement('div');
container.id = 'viewport';
document.body.appendChild(container);

sagaMiddleware.run(rootSaga);

ReactDOM.render(
  <GlobalProvider>
    <App />
  </GlobalProvider>,
  container
);
