import React from 'react';

const Alert = (props) => {
    const { msg, dismiss } = props;
    const handleClick = (event) => {
        event.preventDefault();
        dismiss();
    };

    return (
        <div>
            {msg &&
            <div className="alert alert-danger fade in" style={{ padding: '4px' }}>
                <a
                    href="#"
                    className="close"
                    data-dismiss="alert"
                    aria-label="close"
                    style={{ fontSize: '16px' }}
                    onClick={handleClick}
                >×</a>
                {msg}
            </div>
            }
        </div>
    );
};

Alert.propTypes = {
    msg: React.PropTypes.string,
    dismiss: React.PropTypes.func
};

export default Alert;
