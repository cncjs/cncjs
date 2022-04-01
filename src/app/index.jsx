import React from 'react';
import ReactDOM from 'react-dom';
import App from 'app/containers/App';
import rootSaga from 'app/sagas';
import sagaMiddleware from 'app/store/redux/sagaMiddleware';
import { GlobalProvider } from 'app/context';
import './styles/vendor.styl';
import './styles/app.styl';

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
