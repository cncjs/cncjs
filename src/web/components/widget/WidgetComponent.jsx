import React from 'react';

const noop = () => {};

const WidgetComponent = (Component) => class extends React.Component {
    static propTypes = {
        onDelete: React.PropTypes.func
    };
    static defaultProps = {
        onDelete: noop
    };

    render() {
        return (
            <Component
                {...this.props}
            />
        );
    }
};

export default WidgetComponent;
