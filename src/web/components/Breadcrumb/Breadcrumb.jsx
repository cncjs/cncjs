import React, { Component, cloneElement, PropTypes } from 'react';
import styles from './index.styl';

class Breadcrumb extends Component {
    static propTypes = {
        onClickHelp: PropTypes.func
    };

    handleClickHelp(e) {
        if (this.props.onClickHelp) {
            this.props.onClickHelp();
        }
    }
    render() {
        const {
            children,
            onClickHelp
        } = this.props;
        const hasHelp = !!onClickHelp;

        return (
            <ol
                role="navigation"
                className={styles.breadcrumb}
            >
                {this.renderItems(children)}
                {hasHelp ? this.renderHelpButton() : null}
            </ol>
        );
    }
    renderItems(children = this.props.children) {
        let index = 0;

        return React.Children.map(children, (child) => {
            if (!React.isValidElement(child)) {
                return child;
            }

            const el = cloneElement(child, { key: (child.key !== undefined) ? child.key : index });
            ++index;

            return el;
        });
    }
    renderHelpButton() {
        return (
            <li className={styles['icon-help']} onClick={::this.handleClickHelp} />
        );
    }
}

export default Breadcrumb;
