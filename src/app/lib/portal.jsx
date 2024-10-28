import React from 'react';
import ReactDOM from 'react-dom';
import { GlobalProvider } from '@app/context';

export default (Component, node = null) => new Promise((resolve, reject) => {
  let defaultNode = null;
  let root = null;

  if (!node) {
    defaultNode = document.createElement('div');
    defaultNode.setAttribute('data-portal', '');
    document && document.body && document.body.appendChild(defaultNode);
    root = ReactDOM.createRoot(defaultNode);
  } else {
    root = ReactDOM.createRoot(node);
  }

  root.render(
    <GlobalProvider>
      <Component
        onClose={() => {
          setTimeout(() => {
            root.unmount();
            if (defaultNode) {
              document && document.body && document.body.removeChild(defaultNode);
              defaultNode = null;
            }
            resolve();
          }, 0);
        }}
      />
    </GlobalProvider>
  );
});
