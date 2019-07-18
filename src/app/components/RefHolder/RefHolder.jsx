import React from 'react';

/**
 * Internal helper component to allow attaching a non-conflicting ref to a
 * child element that may not accept refs.
 */
class RefHolder extends React.Component {
    render() {
        return this.props.children;
    }
}

export default RefHolder;
