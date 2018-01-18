import React, { PureComponent } from 'react';
import TaskbarButton from './TaskbarButton';

class Taskbar extends PureComponent {
    render() {
        const { children } = this.props;

        return (
            <div
                className="clearfix"
                style={{
                    borderTop: '1px solid #ddd'
                }}
            >
                <div className="pull-right">
                    {children}
                </div>
            </div>
        );
    }
}

Taskbar.Button = TaskbarButton;

export default Taskbar;
