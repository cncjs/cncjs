import React from 'react';

class Alert extends React.Component {
    render() {
        return (
            <div>
                {this.props.msg &&
                <div className="alert alert-danger fade in" style={{padding: '4px'}}>
                    <a
                        href="javascript:void(0)"
                        className="close"
                        data-dismiss="alert"
                        aria-label="close"
                        style={{fontSize: '16px'}}
                        onClick={this.props.dismiss}
                    >×</a>
                    {this.props.msg}
                </div>
                }
            </div>
        );
    }
}

export default Alert;
