const RenderChildren = ({ children, ...props }) => {
    if (typeof children === 'function') {
        return children(props);
    }

    return children;
};

export default RenderChildren;
