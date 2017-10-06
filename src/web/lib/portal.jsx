import React from 'react';
import ReactDOM from 'react-dom';

export default (Component) => new Promise((resolve, reject) => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    ReactDOM.render(
        <Component
            onClose={() => {
                setTimeout(() => {
                    ReactDOM.unmountComponentAtNode(container);
                    container.remove();
                    resolve();
                }, 0);
            }}
        />,
        container
    );
});
