import get from 'lodash/get';
import Uri from 'jsuri';
import pubsub from 'pubsub-js';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import ReactDOM from 'react-dom';
import settings from 'web/config/settings';
import store from 'web/store';
import Iframe from 'web/components/Iframe';
import ResizeObserver from 'web/lib/ResizeObserver';
import controller from 'web/lib/controller';
import i18n from 'web/lib/i18n';
import log from 'web/lib/log';
import styles from './index.styl';

class Custom extends PureComponent {
    static propTypes = {
        config: PropTypes.object,
        disabled: PropTypes.bool,
        url: PropTypes.string,
        port: PropTypes.string
    };

    pubsubTokens = [];
    iframe = null;
    observer = null;

    componentDidMount() {
        this.subscribe();
    }
    componentWillUnmount() {
        this.unsubscribe();
    }
    componentWillReceiveProps(nextProps) {
        if (nextProps.url !== this.props.url) {
            this.reload();
        }
        if (nextProps.port !== this.props.port) {
            // Post a message to the iframe window
            this.postMessage('change', {
                port: controller.port,
                controller: controller.type
            });
        }
    }
    subscribe() {
        const tokens = [
            pubsub.subscribe('message:connect', () => {
                // Post a message to the iframe window
                this.postMessage('change', {
                    port: controller.port,
                    controller: controller.type
                });
            }),
            pubsub.subscribe('message:resize', (type, payload) => {
                const { scrollHeight } = { ...payload };
                this.resize({ height: scrollHeight });
            })
        ];
        this.pubsubTokens = this.pubsubTokens.concat(tokens);
    }
    unsubscribe() {
        this.pubsubTokens.forEach((token) => {
            pubsub.unsubscribe(token);
        });
        this.pubsubTokens = [];
    }
    postMessage(type = '', payload) {
        const token = store.get('session.token');
        const target = get(this.iframe, 'contentWindow');
        const message = {
            token: token,
            version: settings.version,
            action: {
                type: type,
                payload: {
                    ...payload
                }
            }
        };

        if (target) {
            target.postMessage(message, '*');
        }
    }
    reload(forceGet = false) {
        if (this.iframe) {
            const { url } = this.props;
            const token = store.get('session.token');
            this.iframe.src = new Uri(url)
                .addQueryParam('token', token)
                .toString();

            try {
                // Reload
                this.iframe.contentWindow.location.reload(forceGet);
            } catch (err) {
                // Catch DOMException when accessing the 'contentDocument' property from a cross-origin frame
                log.error(err);
            }
        }
    }
    resize(options) {
        if (!this.iframe) {
            return;
        }

        let { width = 0, height = 0 } = { ...options };
        width = Number(width) || 0;
        height = Number(height) || 0;

        if (!height) {
            try {
                const target = this.iframe.contentDocument.body;
                if (target) {
                    height = target.scrollHeight;
                }
            } catch (err) {
                // Catch DOMException when accessing the 'contentDocument' property from a cross-origin frame
            }
        }

        if (width > 0) {
            // Recalculate the width
            this.iframe.style.width = 0;
            this.iframe.style.width = `${width}px`;
        }
        if (height > 0) {
            // Recalculate the height
            this.iframe.style.height = 0;
            this.iframe.style.height = `${height}px`;
        }
    }
    render() {
        const { disabled, url } = this.props;

        if (!url) {
            return (
                <div className={styles.inactiveContent}>
                    {i18n._('URL not configured')}
                </div>
            );
        }

        if (disabled) {
            return (
                <div className={styles.inactiveContent}>
                    {i18n._('The widget is currently disabled')}
                </div>
            );
        }

        const token = store.get('session.token');
        const iframeSrc = new Uri(url)
            .addQueryParam('token', token)
            .toString();

        return (
            <Iframe
                ref={node => {
                    if (this.observer) {
                        this.observer.disconnect();
                        this.observer = null;
                    }

                    if (!node) {
                        this.iframe = null;
                        return;
                    }

                    this.iframe = ReactDOM.findDOMNode(node);

                    // Use ResizeObserver to detect DOM changes within the iframe window
                    this.iframe.addEventListener('load', () => {
                        try {
                            const target = this.iframe.contentDocument.body;
                            this.observer = new ResizeObserver(() => {
                                this.resize();
                            });
                            this.observer.observe(target);
                        } catch (err) {
                            // Catch DOMException when accessing the 'contentDocument' property from a cross-origin frame
                        }
                    });
                }}
                src={iframeSrc}
                style={{
                    verticalAlign: 'top'
                }}
            />
        );
    }
}

export default Custom;
