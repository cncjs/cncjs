import { iframeResizer } from 'iframe-resizer';
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
        state: PropTypes.object,
        action: PropTypes.object
    };

    iframe = null;

    refresh() {
        if (this.iframe) {
            this.iframe.reload();
        }
    }
    render() {
        const { state } = this.props;
        const { disabled, url } = state;

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
                    if (!node) {
                        this.iframe = null;
                        return;
                    }

                    this.iframe = node;
                    const el = ReactDOM.findDOMNode(this.iframe);

                    // https://github.com/davidjbradshaw/iframe-resizer
                    iframeResizer({
                        log: false,
                        autoResize: true,
                        minHeight: 40
                    }, el);
                }}
                src={iframeSrc}
            />
        );
    }
}

export default Custom;
