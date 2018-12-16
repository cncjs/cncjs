const matchComponent = (Component) => (c) => {
    // React Component
    if (c.type === Component) {
        return true;
    }

    // Matching componentType
    if (c.props && c.props.componentType === Component) {
        return true;
    }

    return false;
};

export default matchComponent;
