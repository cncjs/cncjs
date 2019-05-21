import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import cx from 'classnames';
import Trigger from 'rc-trigger';
import { placements } from './placements';
import styles from './infotip.styl';

class Infotip extends PureComponent {
    static propTypes = {
        placement: PropTypes.oneOf([
            'rightTop',
            'rightBottom',
            'leftTop',
            'leftBottom',
            'right',
            'top',
            'left',
            'bottom'
        ]),
        disabled: PropTypes.bool, // To disable infotip.
        hideOnClick: PropTypes.bool, // Hide infotip when target been clicked.
        enterDelay: PropTypes.number, // The delay length (in ms) before popups appear.
        leaveDelay: PropTypes.number, // The delay length (in ms) between the mouse leaving the target and infotip disappearance.
        // contents
        tooltipClassName: PropTypes.string, // The className apply to infotip itself. You can use it to override style portal if need
        tooltipStyle: PropTypes.object, // The style apply to infotip itself. You can use it to override style portal if need
        content: PropTypes.oneOfType([
            PropTypes.node,
            PropTypes.func
        ]).isRequired
    };

    static defaultProps = {
        placement: 'rightBottom',
        disabled: false,
        hideOnClick: false,
        enterDelay: 0, // milliseconds
        leaveDelay: 0 // milliseconds
    };

    prefixCls = 'tm-tooltip'; // Reset prefix class name

    getPopupElement = () => {
        const { content } = this.props;
        const prefixCls = this.prefixCls;
        return ([
            <div
                className={cx(
                    `${prefixCls}-arrow`
                )}
                key="arrow"
            />,
            <div
                className={cx(
                    `${prefixCls}-inner`,
                    styles['tooltip-inner'],
                    styles['tooltip-inner-light']
                )}
                key="content"
            >
                {typeof content === 'function' ? content() : content}
            </div>
        ]);
    }

    getPopupDomNode() {
        return this.trigger.getPopupDomNode();
    }

    saveTrigger = (node) => {
        this.trigger = node;
    }

    render() {
        const {
            children,
            placement,
            disabled,
            hideOnClick,
            enterDelay,
            leaveDelay,
            tooltipClassName,
            tooltipStyle,
            ...props
        } = this.props;

        // Remove props do not need to set into div
        delete props.content;

        const triggerActions = ['hover'];
        const hideAction = hideOnClick ? ['click'] : [];
        const mouseEnterDelay = enterDelay / 1000; // To seconds
        const mouseLeaveDelay = leaveDelay / 1000; // To seconds

        if (disabled) {
            return children;
        }

        return (
            <Trigger
                ref={this.saveTrigger}
                prefixCls={this.prefixCls}
                action={triggerActions}
                hideAction={hideAction}
                builtinPlacements={placements}
                popupPlacement={placement}
                popup={this.getPopupElement}
                popupClassName={cx(
                    styles.tooltip,
                    tooltipClassName
                )}
                popupStyle={tooltipStyle}
                mouseEnterDelay={mouseEnterDelay}
                mouseLeaveDelay={mouseLeaveDelay}
                {...props}
            >
                {children}
            </Trigger>
        );
    }
}

export default Infotip;
