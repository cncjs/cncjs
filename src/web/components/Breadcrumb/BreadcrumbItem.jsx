import classNames from 'classnames';
import React, { Component, PropTypes } from 'react';
import BreadcrumbDivider from './BreadcrumbDivider';
import Anchor from '../Anchor';
import styles from './index.styl';

class BreadcrumbItem extends Component {
    static propTypes = {
        /**
         * If set to true, renders `span` instead of `a`
         */
        active: PropTypes.bool,
        /**
         * HTML id for the wrapper `li` element
         */
        id: PropTypes.oneOfType([
            PropTypes.string,
            PropTypes.number
        ]),
        /**
         * HTML id for the inner `a` element
         */
        linkId: PropTypes.oneOfType([
            PropTypes.string,
            PropTypes.number
        ]),
        /**
         * `href` attribute for the inner `a` element
         */
        href: PropTypes.string,
        /**
         * `title` attribute for the inner `a` element
         */
        title: PropTypes.node,
        /**
         * `target` attribute for the inner `a` element
         */
        target: PropTypes.string
    };
    defaultProps = {
        active: false
    };

    render() {
        const {
            active,
            className,
            id,
            linkId,
            children,
            href,
            title,
            target
        } = this.props;
        const linkProps = {
            href,
            title,
            target,
            id: linkId
        };

        if (active) {
            return (
                <li
                    id={id}
                    className={classNames(
                        className,
                        { [styles.active]: active }
                    )}
                >
                    <span>
                        {children}
                    </span>
                </li>
            );
        } else if (!linkProps.href) {
            return (
                <li
                    id={id}
                    className={classNames(
                        className,
                        { [styles.active]: active }
                    )}
                >
                    <span>
                        {children}
                    </span>
                    <BreadcrumbDivider />
                </li>
            );
        }

        return (
            <li
                id={id}
                className={className}
            >
                <Anchor {...linkProps}>
                    {children}
                </Anchor>
                <BreadcrumbDivider />
            </li>
        );
    }
}

export default BreadcrumbItem;
