import cx from 'classnames';
import PropTypes from 'prop-types';
import React, { PureComponent, cloneElement } from 'react';
import styles from './index.styl';

class Breadcrumbs extends PureComponent {
    static propTypes = {
        showLineSeparator: PropTypes.bool
    };

    static defaultProps = {
        showLineSeparator: false
    };

    render() {
        const {
            children,
            className
        } = this.props;

        return (
            <ol
                role="navigation"
                className={cx(
                    className,
                    styles.breadcrumbs,
                    { [styles.lineSeparator]: this.props.showLineSeparator }
                )}
            >
                {this.renderItems(children)}
            </ol>
        );
    }

    renderItems(children = this.props.children) {
        return React.Children.map(children, (child, index) => {
            if (!React.isValidElement(child)) {
                return child;
            }

            const el = cloneElement(child, {
                key: (child.key !== undefined) ? child.key : index
            });

            return el;
        });
    }
}

export default Breadcrumbs;
