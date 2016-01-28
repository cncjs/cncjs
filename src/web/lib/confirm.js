import React from 'react';
import ReactDOM from 'react-dom';
import Confirm from '../components/common/Confirm';

// @param {string} message The confirmation message
// @param {object} [options] The options object
// @param {string} [options.description] An optional descriptipn
// @param {string} [options.okLabel] The text for the OK button
// @param {string} [options.cancelLabel] The text for the Cancel button
const confirm = (message, options = {}) => {
    return new Promise((resolve, reject) => {
        const wrapper = document.body.appendChild(document.createElement('div'));  
        const cleanup = () => {
            React.unmountComponentAtNode(wrapper);
            setTimeout(() => {
                wrapper.remove();
            }, 0);
        };
        const handleConfirm = (e) => {
            resolve();
            cleanup();
        };
        const handleCancel = (e) => {
            reject();
            cleanup();
        };

        ReactDOM.render(
            <Confirm {...options}
                message={message}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
            />,
            wrapper
        );
    });
};

export default confirm;
