import _ from 'lodash';
import React from 'react';
import ReactDOM from 'react-dom';

class Iframe extends React.Component {
    static propTypes = {
        url: React.PropTypes.string.isRequired,
        width: React.PropTypes.string,
        height: React.PropTypes.string,
        sandbox: React.PropTypes.string
    };
    static defaultProps = {
        sandbox: 'allow-forms allow-same-origin allow-scripts',
        width: '100%',
        height: '100%'
    };

    shouldComponentUpdate(nextProps, nextState) {
        return !_.isEqual(nextProps, this.props);
    }
    reload() {
        let el = ReactDOM.findDOMNode(this);
        el.src = this.props.url;
    }
    render() {
        const { url, width, height, ...others } = this.props;
        const style = {
            overflow: 'hidden',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0
        };

        return (
            <iframe
                {...others}
                frameBorder="0"
                src={url}
                style={style}
                width={width}
                height={height}
            />
        );
    }
}

export default Iframe;
