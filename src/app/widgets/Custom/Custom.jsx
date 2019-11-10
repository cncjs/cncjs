import _get from 'lodash/get';
import Uri from 'jsuri';
import pubsub from 'pubsub-js';
import React, { useEffect, useRef } from 'react';
import ResizeObserver from 'resize-observer-polyfill';
import styled from 'styled-components';
import settings from 'app/config/settings';
import Iframe from 'app/components/Iframe';
import useEffectOnce from 'app/hooks/useEffectOnce';
import controller from 'app/lib/controller';
import { ensurePositiveNumber } from 'app/lib/ensure-type';
import i18n from 'app/lib/i18n';
import configStore from 'app/store/config';
import useWidgetConfig from 'app/widgets/shared/useWidgetConfig';
import useWidgetEvent from 'app/widgets/shared/useWidgetEvent';

const Custom = ({
    disabled,
}) => {
    const config = useWidgetConfig();
    const emitter = useWidgetEvent();
    const url = config.get('url');
    const iframeRef = useRef(null);
    const token = configStore.get('session.token');

    useEffect(() => {
        const reload = (forceGet = false) => {
            const iframe = iframeRef.current;
            if (!iframe) {
                return;
            }

            iframe.src = new Uri(url)
                .addQueryParam('token', token)
                .toString();

            try {
                // Reload
                iframe.contentWindow.location.reload(forceGet);
            } catch (err) {
                // Catch DOMException when accessing the 'contentDocument' property from a cross-origin frame
                console.error(err);
            }
        };

        emitter.on('refresh', reload);

        return () => {
            emitter.off('refresh', reload);
        };
    }, [emitter, token, url]);

    useEffectOnce(() => {
        const postMessage = (type = '', payload) => {
            const iframe = iframeRef.current;
            const target = _get(iframe, 'contentWindow');
            if (!target) {
                return;
            }

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

            target.postMessage(message, '*');
        };

        const resize = (options) => {
            const iframe = iframeRef.current;
            if (!iframe) {
                return;
            }

            let { width = 0, height = 0 } = { ...options };
            width = ensurePositiveNumber(width);
            height = ensurePositiveNumber(height);

            if (!height) {
                try {
                    const target = iframe.contentDocument.body;
                    if (target) {
                        height = target.scrollHeight;
                    }
                } catch (err) {
                    // Catch DOMException when accessing the 'contentDocument' property from a cross-origin frame
                }
            }

            if (width > 0) {
                // Recalculate the width
                iframe.style.width = 0;
                iframe.style.width = `${width}px`;
            }
            if (height > 0) {
                // Recalculate the height
                iframe.style.height = 0;
                iframe.style.height = `${height}px`;
            }
        };

        const tokens = [
            pubsub.subscribe('message:connect', () => {
                // Post a message to the iframe window
                postMessage('change', {
                    controller: {
                        type: _get(controller, 'type'),
                    },
                    connection: {
                        type: _get(controller, 'connection.type'),
                        ident: _get(controller, 'connection.ident'),
                        options: _get(controller, 'connection.options'),
                    },
                });
            }),
            pubsub.subscribe('message:resize', (type, payload) => {
                const { scrollHeight } = { ...payload };
                resize({
                    height: scrollHeight,
                });
            }),
        ];

        return () => {
            tokens.forEach((token) => {
                pubsub.unsubscribe(token);
            });
        };
    });

    if (disabled) {
        return (
            <InactiveContent>
                {i18n._('The widget is currently disabled')}
            </InactiveContent>
        );
    }

    if (!url) {
        return (
            <InactiveContent>
                {i18n._('URL not configured')}
            </InactiveContent>
        );
    }

    const iframeSrc = new Uri(url)
        .addQueryParam('token', token)
        .toString();

    return (
        <Iframe
            src={iframeSrc}
            style={{
                verticalAlign: 'top',
            }}
            onLoad={({ event, iframe }) => {
                if (!(iframe && iframe.contentDocument)) {
                    return;
                }

                iframeRef.current = iframe;

                const target = iframe.contentDocument.body;
                const nextHeight = target.offsetHeight;
                iframe.style.height = `${nextHeight}px`;

                const observer = new ResizeObserver(entries => {
                    const target = iframe.contentDocument.body;
                    const nextHeight = target.offsetHeight;
                    iframe.style.height = `${nextHeight}px`;
                });
                observer.observe(target);
            }}
            onBeforeUnload={({ event }) => {
                iframeRef.current = null;
            }}
        />
    );
};

/*
class Custom extends Component {
    static propTypes = {
        config: PropTypes.object,
        disabled: PropTypes.bool,
        url: PropTypes.string,
        port: PropTypes.string
    };

    pubsubTokens = [];

    iframe = null;

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
        const token = config.get('session.token');
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
            const token = config.get('session.token');
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
        width = ensurePositiveNumber(width);
        height = ensurePositiveNumber(height);

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

        if (disabled) {
            return (
                <InactiveContent>
                    {i18n._('The widget is currently disabled')}
                </InactiveContent>
            );
        }

        if (!url) {
            return (
                <InactiveContent>
                    {i18n._('URL not configured')}
                </InactiveContent>
            );
        }

        const token = config.get('session.token');
        const iframeSrc = new Uri(url)
            .addQueryParam('token', token)
            .toString();

        return (
            <Iframe
                src={iframeSrc}
                style={{
                    verticalAlign: 'top'
                }}
                onLoad={({ event, iframe }) => {
                    if (!(iframe && iframe.contentDocument)) {
                        return;
                    }

                    this.iframe = iframe;

                    const target = iframe.contentDocument.body;
                    const nextHeight = target.offsetHeight;
                    iframe.style.height = `${nextHeight}px`;

                    const observer = new ResizeObserver(entries => {
                        const target = iframe.contentDocument.body;
                        const nextHeight = target.offsetHeight;
                        iframe.style.height = `${nextHeight}px`;
                    });
                    observer.observe(target);
                }}
                onBeforeUnload={({ event }) => {
                    this.iframe = null;
                }}
            />
        );
    }
}
*/

export default Custom;

const InactiveContent = styled.div`
    padding: 8px 12px;
    opacity: .65;
`;
