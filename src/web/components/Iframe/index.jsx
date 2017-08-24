import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import ReactDOM from 'react-dom';

const mapSandboxFromObjectToString = (sandbox) => {
    sandbox = { ...sandbox };

    return Object.keys(sandbox)
        .filter(key => sandbox[key])
        .map(s => s.replace(/[A-Z]/g, '-$&').toLowerCase())
        .join(' ');
};

class Iframe extends PureComponent {
    static propTypes = {
        src: PropTypes.string.isRequired,
        width: PropTypes.string,
        height: PropTypes.string,
        sandbox: PropTypes.shape({
            // Re-enables form submission
            allowForms: PropTypes.bool,

            // Sandboxed frames will block modal dialogs by default
            allowModals: PropTypes.bool,

            // Re-enables APIs
            allowPointerLock: PropTypes.bool,

            // Re-enables popups
            allowPopups: PropTypes.bool,

            // Allows the iframe content to be treated as being from the same origin
            allowSameOrigin: PropTypes.bool,

            // Re-enables scripts
            allowScripts: PropTypes.bool,

            // Allows the iframe content to navigate its top-level browsing context
            allowTopNavigation: PropTypes.bool
        })
    };
    static defaultProps = {
        width: '100%',
        height: '100%',
        sandbox: {
            allowForms: true,
            allowModals: true,
            allowPointerLock: false,
            allowPopups: true,
            allowSameOrigin: true,
            allowScripts: true,
            allowTopNavigation: false
        }
    };

    reload() {
        const el = ReactDOM.findDOMNode(this);
        el.src = this.props.src;
    }
    render() {
        const { style, ...props } = this.props;
        const sandbox = mapSandboxFromObjectToString(props.sandbox);
        delete props.sandbox;

        return (
            <iframe
                frameBorder="0"
                sandbox={sandbox}
                style={{
                    overflow: 'hidden',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    ...style
                }}
                {...props}
            />
        );
    }
}

export default Iframe;
