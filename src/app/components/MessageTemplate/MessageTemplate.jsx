import PropTypes from 'prop-types';
import React from 'react';

const MessageTemplate = (props) => {
    const { type, children } = props;
    const icon = {
        error: (
            <i className="fa fa-times-circle fa-4x" style={{ color: '#db3d44' }} />
        ),
        warning: (
            <i className="fa fa-exclamation-circle fa-4x" style={{ color: '#faca2a' }} />
        ),
        info: (
            <i className="fa fa-info-circle fa-4x" style={{ color: '#0096cc' }} />
        ),
        question: (
            <i className="fa fa-question-circle fa-4x" style={{ color: '#0096cc' }} />
        ),
        success: (
            <i className="fa fa-check-circle fa-4x" style={{ color: '#00a94f' }} />
        )
    }[type];

    if (!icon) {
        return children;
    }

    return (
        <div style={{ display: 'flex' }}>
            {icon}
            <div style={{ marginLeft: 25 }}>
                {children}
            </div>
        </div>
    );
};

MessageTemplate.propTypes = {
    type: PropTypes.oneOf([
        'error',
        'warning',
        'info',
        'question',
        'success'
    ])
};

export default MessageTemplate;
