/* eslint jsx-a11y/iframe-has-title: 0 */
import PropTypes from 'prop-types';
import React, { Component } from 'react';

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

class Iframe extends Component {
    static propTypes = {
        // The width attribute specifies the width of an iframe, in pixels.
        width: PropTypes.oneOfType([
            PropTypes.number,
            PropTypes.string,
        ]),

        // The height attribute specifies the height of an iframe, in pixels.
        height: PropTypes.oneOfType([
            PropTypes.number,
            PropTypes.string,
        ]),

        // The sandbox attribute enables an extra set of restrictions for the content in the iframe.
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
                allowTopNavigation: PropTypes.bool,
            })
        ]),

        // Callback invoked when the iframe has been loaded: `({ event: Event, iframe: HTMLElement }): void`
        onLoad: PropTypes.func,

        // Callback invoked when the iframe has unloaded: `({ event: Event }): void`
        onUnload: PropTypes.func,

        // Callback invoked when the iframe is about to be unloaded: `({ event: Event, iframe: HTMLElement }): void`
        onBeforeUnload: PropTypes.func,
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
            allowTopNavigation: false,
        },
        onLoad: () => {},
        onBeforeUnload: () => {},
        onUnload: () => {},
    };

    static getDerivedStateFromProps(nextProps, prevState) {
        const nextSrc = nextProps.src;
        const prevSrc = prevState.src;

        if (nextSrc !== prevSrc) {
            return {
                src: nextSrc,
                loading: !!nextSrc,
                loaded: false,
            };
        }

        return null;
    }

    state = {
        src: null,
        loading: false,
        loaded: false,
    };

    iframe = React.createRef();

    onLoadHandler = (event) => {
        this.setState({
            loading: false,
            loaded: !!this.props.src
        });

        if (typeof this.props.onLoad === 'function') {
            this.props.onLoad({
                event,
                iframe: this.iframe.current
            });
        }
    };

    onBeforeUnloadHandler = (event) => {
        if (typeof this.props.onBeforeUnload === 'function') {
            this.props.onBeforeUnload({
                event,
                iframe: this.iframe.current
            });
        }
    };

    onUnloadHandler = (event) => {
        if (typeof this.props.onUnload === 'function') {
            this.props.onUnload({
                event
            });
        }
    };

    componentDidMount() {
        const node = this.iframe.current;
        if (node) {
            node.addEventListener('load', this.onLoadHandler);
            node.addEventListener('beforeunload', this.onBeforeUnloadHandler);
            node.addEventListener('unload', this.onUnloadHandler);
        }
    }

    componentWillUnmount() {
        const node = this.iframe.current;
        if (node) {
            node.removeEventListener('load', this.onLoadHandler);
            node.removeEventListener('beforeunload', this.onBeforeUnloadHandler);
            node.removeEventListener('unload', this.onUnloadHandler);
        }
    }

    render() {
        const {
            style,
            onLoad, // eslint-disable-line
            onBeforeUnload, // eslint-disable-line
            onUnload, // eslint-disable-line
            ...props
        } = this.props;

        if (props.sandbox === false) {
            delete props.sandbox;
        } else if (typeof props.sandbox === 'object') {
            props.sandbox = mapSandboxToString(props.sandbox);
        }

        return (
            <iframe
                ref={this.iframe}
                {...props}
                src={this.state.src}
                style={{
                    borderWidth: 0,
                    ...style
                }}
            />
        );
    }
}

export default Iframe;
