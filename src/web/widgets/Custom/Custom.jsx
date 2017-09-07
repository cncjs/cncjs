import Uri from 'jsuri';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import ReactDOM from 'react-dom';
import store from '../../store';
import Iframe from '../../components/Iframe';
import i18n from '../../lib/i18n';
import styles from './index.styl';

class Custom extends PureComponent {
    static propTypes = {
        config: PropTypes.object,
        disabled: PropTypes.bool,
        url: PropTypes.string
    };

    iframe = null;
    observer = null;

    reload(forceGet = false) {
        if (this.iframe) {
            this.iframe.contentWindow.location.reload(forceGet);
        }
    }
    render() {
        const { disabled, url } = this.props;

        if (disabled) {
            return (
                <div className={styles.inactiveContent}>
                    {i18n._('Widget is not enabled')}
                </div>
            );
        }

        // Pass token in query string
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
                    this.iframe.addEventListener('load', () => {
                        const target = this.iframe.contentDocument.body;
                        const config = {
                            attributes: true,
                            attributeOldValue: false,
                            characterData: true,
                            characterDataOldValue: false,
                            childList: true,
                            subtree: true
                        };

                        // Recalculate the height of the content
                        this.iframe.style.height = 0;
                        const nextHeight = target.scrollHeight;
                        this.iframe.style.height = `${nextHeight}px`;

                        this.observer = new MutationObserver(mutations => {
                            // Recalculate the height of the content
                            this.iframe.style.height = 0;
                            const nextHeight = target.scrollHeight;
                            this.iframe.style.height = `${nextHeight}px`;
                        });
                        this.observer.observe(target, config);
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
