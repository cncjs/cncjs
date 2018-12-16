const getElementStyle = (e, style) => {
    return (e.style[style] || window.getComputedStyle(e, null)[style]);
};

const getSubElements = (parent, selector) => {
    return [].filter.call(parent.querySelectorAll(selector), (e) => {
        return e.parentNode === parent;
    });
};

export default {
    getElementStyle,
    getSubElements
};
