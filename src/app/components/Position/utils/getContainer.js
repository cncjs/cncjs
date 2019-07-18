import ReactDOM from 'react-dom';

const getContainer = (container, defaultContainer) => {
    container = typeof container === 'function' ? container() : container;
    return ReactDOM.findDOMNode(container) || defaultContainer;
};

export default getContainer;
