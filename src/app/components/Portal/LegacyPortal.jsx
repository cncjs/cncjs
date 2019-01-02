import PropTypes from 'prop-types';
import React from 'react';
import ReactDOM from 'react-dom';

class Portal extends React.Component {
    static propTypes = {
        node: PropTypes.any
    };

    constructor(props) {
        super(props);

        this.node = document.createElement('div');
        this.node.setAttribute('data-reactportal', '');
    }

    componentDidMount() {
        if (this.props.node) {
            this.props.node.appendChild(this.node);
        } else {
            document.body.appendChild(this.node);
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
        ReactDOM.render(
            this.props.children,
            this.node
        );
    }

    render() {
        return null;
    }
}

export default Portal;
