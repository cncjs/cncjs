import _ from 'lodash';
import Infinite from 'react-infinite';
import React from 'react';
import ReactDOM from 'react-dom';

class ConsoleWindow extends React.Component {
    static propTypes = {
        buffers: React.PropTypes.array
    };

    // Scroll Position with React
    // http://blog.vjeux.com/2013/javascript/scroll-position-with-react.html
    componentWillUpdate() {
        let node = ReactDOM.findDOMNode(this.refs.infinite);
        let hScrollBarHeight = (node.scrollWidth != node.clientWidth) ? 20 : 0;
        this.shouldScrollBottom = ((node.scrollTop + node.clientHeight + hScrollBarHeight) >= node.scrollHeight);
    }
    componentDidUpdate() {
        let node = ReactDOM.findDOMNode(this.refs.infinite);
        if (this.shouldScrollBottom) {
            node.scrollTop = node.scrollHeight;
        }
    }
    buildElements(buffers) {
        return _.map(buffers, (msg, index) => {
            return (
                <div key={index} className="infinite-list-item">{msg}</div>
            );
        });
    }
    render() {
        let { buffers } = this.props;
        let elements = this.buildElements(buffers);

        return (
            <div className="console-window">
                <Infinite
                    containerHeight={260}
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
