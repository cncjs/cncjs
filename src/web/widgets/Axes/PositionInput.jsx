import React, { Component, PropTypes } from 'react';

class PositionInput extends Component {
    static propTypes = {
        defaultValue: PropTypes.string,
        onOK: PropTypes.func.isRequired,
        onCancel: PropTypes.func.isRequired,
        min: PropTypes.number,
        max: PropTypes.number
    };
    static defaultProps = {
        defaultValue: '',
        onOK: (value) => {},
        onCancel: () => {},
        min: -10000,
        max: 10000
    };

    state = {
        value: this.props.defaultValue
    };

    componentDidMount() {
        this.positionInput.focus();
    }
    render() {
        const { onOK, onCancel, min, max } = this.props;
        const isNumber = (this.state.value !== '');

        return (
            <div className="input-group input-group-xs" style={{ width: '100%' }}>
                <input
                    ref={node => {
                        this.positionInput = node;
                    }}
                    type="number"
                    className="form-control"
                    placeholder=""
                    style={{ borderRight: 'none' }}
                    value={this.state.value}
                    onChange={(event) => {
                        let value = event.target.value;

                        if (value === '') {
                            this.setState({ value: '' });
                            return;
                        }
                        if (value >= min && value <= max) {
                            this.setState({ value: value });
                        }
                    }}
                    onKeyDown={(event) => {
                        if (event.keyCode === 13) { // ENTER
                            onOK(this.state.value);
                        }
                        if (event.keyCode === 27) { // ESC
                            onCancel();
                        }
                    }}
                />
                <div className="input-group-btn">
                    <button
                        type="button"
                        className="btn btn-default"
                        disabled={!isNumber}
                        onClick={(event) => {
                            onOK(this.state.value);
                        }}
                    >
                        <i className="fa fa-check" />
                    </button>
                    <button
                        type="button"
                        className="btn btn-default"
                        onClick={(event) => {
                            onCancel();
                        }}
                    >
                        <i className="fa fa-close" />
                    </button>
                </div>
            </div>
        );
    }
}

export default PositionInput;
