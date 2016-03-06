import React from 'react';

const Alert = ({ msg, dismiss }) => (
    <div>
        {msg &&
        <div className="alert alert-danger fade in" style={{ padding: '4px' }}>
            <a
                href="#"
                className="close"
                data-dismiss="alert"
                aria-label="close"
                style={{ fontSize: '16px' }}
                onClick={(e) => {
                    e.preventDefault();
                    dismiss();
                }}
            >×</a>
            {msg}
        </div>
        }
    </div>
);

Alert.propTypes = {
    msg: React.PropTypes.string,
    dismiss: React.PropTypes.func
};

export default Alert;
