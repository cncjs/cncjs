import cx from 'classnames';
import PropTypes from 'prop-types';
import React, { cloneElement, PureComponent } from 'react';
import TabPane from './TabPane';
import styles from './index.styl';

const getComponentType = (Component) => (Component ? (<Component />).type : undefined);

class TabContent extends PureComponent {
    static propTypes = {
        activeKey: PropTypes.any
    };

    render() {
        const { activeKey, className, children, ...props } = this.props;

        return (
            <div
                {...props}
                className={cx(className, styles.tabContent)}
            >
                {React.Children.map(children, child => {
                    if (React.isValidElement(child) && child.type === getComponentType(TabPane)) {
                        const active = (child.props.eventKey === activeKey);

                        return cloneElement(child, {
                            active
                        });
                    }

                    return child;
                })}
            </div>
        );
    }
}

export default TabContent;
