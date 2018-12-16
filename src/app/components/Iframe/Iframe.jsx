/* eslint jsx-a11y/iframe-has-title: 0 */
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';

const mapSandboxToString = (sandbox = '') => {
    if (typeof sandbox === 'string') {
        return sandbox;
    }
    sandbox = { ...sandbox };
    return Object.keys(sandbox)
        .filter(key => sandbox[key])
        .map(s => s.replace(/[A-Z]/g, '-$&').toLowerCase())
        .join(' ');
};

class Iframe extends PureComponent {
    static propTypes = {
        width: PropTypes.oneOfType([
            PropTypes.string,
            PropTypes.number
        ]),
        height: PropTypes.oneOfType([
            PropTypes.string,
            PropTypes.number
        ]),
        sandbox: PropTypes.oneOfType([
            PropTypes.bool,
            PropTypes.string,
            PropTypes.shape({
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
        ])
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

    render() {
        const { style, ...props } = this.props;

        if (props.sandbox === false) {
            delete props.sandbox;
        } else if (typeof props.sandbox === 'object') {
            props.sandbox = mapSandboxToString(props.sandbox);
        }

        return (
            <iframe
                {...props}
                style={{
                    borderWidth: 0,
                    ...style
                }}
            />
        );
    }
}

export default Iframe;
