import _ from 'lodash';
import Infinite from 'react-infinite';
import React from 'react';
import ReactDOM from 'react-dom';

const DEFAULT_CONTAINER_HEIGHT = 260;

class ConsoleWindow extends React.Component {
    static propTypes = {
        buffers: React.PropTypes.array,
        fullscreen: React.PropTypes.bool
    };
    state = {
        containerHeight: DEFAULT_CONTAINER_HEIGHT,
        elementHeight: 20
    };

    shouldComponentUpdate(nextProps, nextState) {
        return !_.isEqual(nextProps, this.props) || !_.isEqual(nextState, this.state);
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
            this.updateContainerHeight();
        }, 0);
    }
    updateContainerHeight() {
        let containerHeight = DEFAULT_CONTAINER_HEIGHT;

        // A workaround solution in fullscreen mode since the `containerHeight` is required
        // https://github.com/seatgeek/react-infinite/issues/62
        if (this.props.fullscreen) {
            // widgetEl = <div class="widget widget-fullscreen"></div>
            const widgetEl = document.querySelector('[data-widgetid="console"] > .widget');
            const widgetContentEl = widgetEl.querySelector('.widget-content');
            const widgetContentPadding = 10;
            const consoleInputEl = widgetContentEl.querySelector('.console-input');

            containerHeight = widgetContentEl.offsetHeight
                            - widgetContentPadding * 2
                            - consoleInputEl.offsetHeight
                            - 10; // extra padding
        }

        if (this.state.containerHeight !== containerHeight) {
            this.setState({ containerHeight: containerHeight });
        }
    }
    buildElements(buffers) {
        return _.map(buffers, (msg, index) => (
            <div key={index} className="infinite-list-item" title={msg}>{msg}</div>
        ));
    }
    render() {
        const { buffers } = this.props;
        const { containerHeight, elementHeight } = this.state;
        const elements = this.buildElements(buffers);

        return (
            <div className="console-window">
                <Infinite
                    containerHeight={containerHeight}
                    elementHeight={elementHeight}
                    ref="infinite"
                >
                    {elements}
                </Infinite>
            </div>
        );
    }
}

export default ConsoleWindow;
