import React from 'react';
import ReactDOM from 'react-dom';

export default (Component, node = null) => new Promise((resolve, reject) => {
    let defaultNode = null;

    if (!node) {
        defaultNode = document.createElement('div');
        defaultNode.setAttribute('data-portal', '');
        document && document.body && document.body.appendChild(defaultNode);
    }

    ReactDOM.render(
        <Component
            onClose={() => {
                setTimeout(() => {
                    if (node) {
                        ReactDOM.unmountComponentAtNode(node);
                    } else if (defaultNode) {
                        ReactDOM.unmountComponentAtNode(defaultNode);
                        document && document.body && document.body.removeChild(defaultNode);
                        defaultNode = null;
                    }

                    resolve();
                }, 0);
            }}
        />,
        node || defaultNode
    );
});
