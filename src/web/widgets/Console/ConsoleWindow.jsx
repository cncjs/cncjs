import _ from 'lodash';
import pubsub from 'pubsub-js';
import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';
import shallowCompare from 'react-addons-shallow-compare';
import Infinite from 'react-infinite';
import styles from './index.styl';

class ConsoleWindow extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };
    pubsubTokens = [];

    componentDidMount() {
        this.subscribe();
    }
    componentWillUnmount() {
        this.unsubscribe();
    }
    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
    // Scroll Position with React
    // http://blog.vjeux.com/2013/javascript/scroll-position-with-react.html
    componentWillUpdate(nextProps, nextState) {
        const node = ReactDOM.findDOMNode(this.node);
        const hScrollBarHeight = (node.scrollWidth !== node.clientWidth) ? 20 : 0;
        this.shouldScrollBottom = (Math.ceil(node.scrollTop) + node.clientHeight + hScrollBarHeight) >= node.scrollHeight;
    }
    componentDidUpdate(prevProps, prevState) {
        const node = ReactDOM.findDOMNode(this.node);
        if (this.shouldScrollBottom) {
            node.scrollTop = node.scrollHeight;
        }

        setTimeout(() => {
            this.resizeConsoleWindow();
        }, 0);
    }
    subscribe() {
        const tokens = [
            pubsub.subscribe('resize', (msg) => {
                this.resizeConsoleWindow();
            })
        ];
        this.pubsubTokens = this.pubsubTokens.concat(tokens);
    }
    unsubscribe() {
        _.each(this.pubsubTokens, (token) => {
            pubsub.unsubscribe(token);
        });
        this.pubsubTokens = [];
    }
    resizeConsoleWindow() {
        const { state, actions } = this.props;
        const widgetContentEl = actions.getWidgetContentEl();
        const node = ReactDOM.findDOMNode(this.node);
        const offset = node.getBoundingClientRect().top
                     - widgetContentEl.getBoundingClientRect().top;
        const containerHeight = widgetContentEl.clientHeight - offset - 10; // exclude 10px bottom padding

        if (state.containerHeight !== containerHeight) {
            actions.setContainerHeight(containerHeight);
        }
    }
    render() {
        const { state } = this.props;
        const { containerHeight, lines } = state;
        const elements = _.map(lines, (line, index) => (
            <div key={index} className={styles['infinite-list-item']} title={line}>{line}</div>
        ));

        return (
            <div className={styles['console-window']}>
                <Infinite
                    ref={c => {
                        this.node = c;
                    }}
                    containerHeight={containerHeight}
                    elementHeight={20}
                >
                    {elements}
                </Infinite>
            </div>
        );
    }
}

export default ConsoleWindow;
