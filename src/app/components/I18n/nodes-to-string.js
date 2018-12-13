import { isValidElement } from 'react';

const hasChildren = (node) => {
    return node && (node.children || (node.props && node.props.children));
};

const getChildren = (node) => {
    return node && node.children ? node.children : node.props && node.props.children;
};

const nodesToString = (mem, children, index) => {
    if (!children) {
        return '';
    }

    if (Object.prototype.toString.call(children) !== '[object Array]') {
        children = [children];
    }

    children.forEach((child, i) => {
        const elementKey = `${i}`;

        if (typeof child === 'string') {
            mem = `${mem}${child}`;
        } else if (hasChildren(child)) {
            mem = `${mem}<${elementKey}>${nodesToString('', getChildren(child), i + 1)}</${elementKey}>`;
        } else if (isValidElement(child)) {
            mem = `${mem}<${elementKey}></${elementKey}>`;
        } else if (typeof child === 'object') {
            const clone = { ...child };
            const format = clone.format;
            delete clone.format;

            const keys = Object.keys(clone);

            if (format && keys.length === 1) {
                mem = `${mem}<${elementKey}>{{${keys[0]}, ${format}}}</${elementKey}>`;
            } else if (keys.length === 1) {
                mem = `${mem}<${elementKey}>{{${keys[0]}}}</${elementKey}>`;
            } else if (console && console.warn) {
                // not a valid interpolation object (can only contain one value plus format)
                console.warn('The passed in object contained more than one variable - the object should look like {{ value, format }} where format is optional.', child);
            }
        } else if (console && console.warn) {
            console.warn('The passed in value is invalid - seems you passed in a variable like {number} - please pass in variables for interpolation as full objects like {{number}}.', child);
        }
    });

    return mem;
};

export default nodesToString;
