import React from 'react';

export default class Progress extends React.Component {
    render() {
        let now = this.props.now || 0;
        let min = this.props.min || 0;
        let max = this.props.max || 0;
        return (
            <div>
                <div className="progress">
                    <div
                        className="progress-bar"
                        role="progressbar"
                        aria-valuenow={now}
                        aria-valuemin={min}
                        aria-valuemax={max}
                        style={{width: now + '%'}}
                    >
                        <span>{now}%</span>
                    </div>
                </div>
            </div>
        );
    }
}
