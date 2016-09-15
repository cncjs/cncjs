import _ from 'lodash';
import pubsub from 'pubsub-js';
import React, { Component, PropTypes } from 'react';
import CSSModules from 'react-css-modules';
import ReactDOM from 'react-dom';
import Infinite from 'react-infinite';
import styles from './index.styl';

@CSSModules(styles)
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
        return !_.isEqual(nextProps, this.props);
    }
    // Scroll Position with React
    // http://blog.vjeux.com/2013/javascript/scroll-position-with-react.html
    componentWillUpdate(nextProps, nextState) {
        const node = ReactDOM.findDOMNode(this.refs.infinite);
        const hScrollBarHeight = (node.scrollWidth !== node.clientWidth) ? 20 : 0;
        this.shouldScrollBottom = (Math.ceil(node.scrollTop) + node.clientHeight + hScrollBarHeight) >= node.scrollHeight;
    }
    componentDidUpdate(prevProps, prevState) {
        const node = ReactDOM.findDOMNode(this.refs.infinite);
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
        const node = ReactDOM.findDOMNode(this.refs.infinite);
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
            <div styleName="console-window">
                <Infinite
                    containerHeight={containerHeight}
                    elementHeight={20}
                    ref="infinite"
                >
                    {elements}
                </Infinite>
            </div>
        );
    }
}

export default ConsoleWindow;
