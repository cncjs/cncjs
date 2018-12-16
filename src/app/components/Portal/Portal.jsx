import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import ReactDOM from 'react-dom';

class Portal extends PureComponent {
    static propTypes = {
        node: PropTypes.any
    };

    node = null;

    componentDidMount() {
        if (!this.node) {
            this.node = document.createElement('div');
            this.node.setAttribute('data-reactportal', '');

            if (this.props.node) {
                this.props.node.appendChild(this.node);
            } else {
                document.body.appendChild(this.node);
            }
        }
        this.componentDidUpdate();
    }
    componentWillUnmount() {
        if (this.node) {
            ReactDOM.unmountComponentAtNode(this.node);
            if (this.node.parentNode) {
                this.node.parentNode.removeChild(this.node);
            }
            this.node = null;
        }
    }
    componentDidUpdate() {
        const props = { ...this.props };
        delete props.node;

        ReactDOM.render(
            <div {...props} />,
            this.node
        );
    }
    render() {
        return null;
    }
}

export default Portal;
