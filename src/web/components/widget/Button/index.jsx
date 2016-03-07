import React from 'react';
import DefaultButton from './DefaultButton';
import DeleteButton from './DeleteButton';
import EditButton from './EditButton';
import FullscreenButton from './FullscreenButton';
import ToggleButton from './ToggleButton';
import RefreshButton from './RefreshButton';

const Button = ({ type, children, ...props }) => {
    if (type === 'edit') {
        return <EditButton {...props}>{children}</EditButton>;
    }
    if (type === 'refresh') {
        return <RefreshButton {...props}>{children}</RefreshButton>;
    }
    if (type === 'toggle') {
        return <ToggleButton {...props}>{children}</ToggleButton>;
    }
    if (type === 'fullscreen') {
        return <FullscreenButton {...props}>{children}</FullscreenButton>;
    }
    if (type === 'delete') {
        return <DeleteButton {...props}>{children}</DeleteButton>;
    }

    return <DefaultButton {...props}>{children}</DefaultButton>;
};

Button.propTypes = {
    children: React.PropTypes.node,
    type: React.PropTypes.string
};
Button.defaultProps = {
    type: 'default'
};

export default Button;
