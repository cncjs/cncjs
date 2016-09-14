/* eslint react/no-set-state: 0 */
import classNames from 'classnames';
import React from 'react';
import CSSModules from 'react-css-modules';
import Anchor from '../../Anchor';
import styles from '../index.styl';

@CSSModules(styles)
class ToggleButton extends React.Component {
    static propTypes = {
        defaultValue: React.PropTypes.bool,
        title: React.PropTypes.string,
        onClick: React.PropTypes.func.isRequired
    };
    static defaultProps = {
        defaultValue: false,
        onClick: () => {}
    };
    state = {
        isCollapsed: this.props.defaultValue
    };

    handleClick(event) {
        const { onClick } = this.props;
        const { isCollapsed } = this.state;
        event.preventDefault();
        onClick(event, !isCollapsed);
        this.setState({ isCollapsed: !isCollapsed });
    }
    render() {
        const { children, title, ...others } = this.props;
        const { isCollapsed } = this.state;
        const classes = {
            icon: classNames(
                'fa',
                { 'fa-chevron-up': !isCollapsed },
                { 'fa-chevron-down': isCollapsed }
            )
        };

        return (
            <Anchor
                {...others}
                title={title}
                styleName="btn-icon"
                onClick={::this.handleClick}
            >
            {children ||
                <i className={classes.icon}></i>
            }
            </Anchor>
        );
    }
}

export default ToggleButton;
