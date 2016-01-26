import _ from 'lodash';
import Infinite from 'react-infinite';
import React from 'react';
import ReactDOM from 'react-dom';

class ConsoleWindow extends React.Component {
    static propTypes = {
        buffers: React.PropTypes.array,
        fullscreen: React.PropTypes.bool
    };
    state = {
        containerHeight: 260,
        elementHeight: 20
    };

    // Scroll Position with React
    // http://blog.vjeux.com/2013/javascript/scroll-position-with-react.html
    componentWillUpdate(nextProps, nextState) {
        let node = ReactDOM.findDOMNode(this.refs.infinite);
        let hScrollBarHeight = (node.scrollWidth != node.clientWidth) ? 20 : 0;
        this.shouldScrollBottom = ((node.scrollTop + node.clientHeight + hScrollBarHeight) >= node.scrollHeight);
    }
    componentDidUpdate(prevProps, prevState) {
        let node = ReactDOM.findDOMNode(this.refs.infinite);
        if (this.shouldScrollBottom) {
            node.scrollTop = node.scrollHeight;
        }

        // A workaround solution in fullscreen mode since the `containerHeight` is required
        // https://github.com/seatgeek/react-infinite/issues/62
        if (this.props.fullscreen) {
            // widgetEl = <div class="widget widget-fullscreen"></div>
            let widgetEl = node.parentNode.parentNode.parentNode.parentNode;
            let widgetHeaderEl = widgetEl.querySelector('.widget-header');
            let widgetContentPadding = 10;
            let consoleInputHeight = 40;
            let containerHeight = widgetEl.clientHeight
                                - widgetHeaderEl.offsetHeight
                                - widgetContentPadding * 2
                                - consoleInputHeight;
                                - 20; // extra padding
            if (this.state.containerHeight !== containerHeight) {
                this.setState({ containerHeight: containerHeight });
            }
        } else {
            let containerHeight = 260;
            if (this.state.containerHeight !== containerHeight) {
                this.setState({ containerHeight: containerHeight });
            }
        }
    }
    buildElements(buffers) {
        return _.map(buffers, (msg, index) => {
            return (
                <div key={index} className="infinite-list-item" title={msg}>{msg}</div>
            );
        });
    }
    render() {
        let { buffers, fullscreen } = this.props;
        let { containerHeight, elementHeight } = this.state;
        let elements = this.buildElements(buffers);

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
