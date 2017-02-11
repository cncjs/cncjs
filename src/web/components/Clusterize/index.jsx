import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';
import Clusterize from 'clusterize.js';

export default class extends Component {
    static propTypes = {
        rows: PropTypes.array,
        scrollTop: PropTypes.number
    };
    static defaultProps = {
        rows: [],
        scrollTop: 0
    };

    clusterize = null;
    scrollElem = null;
    contentElem = null;

    componentDidMount() {
        const scrollElem = ReactDOM.findDOMNode(this.scrollElem);
        const contentElem = ReactDOM.findDOMNode(this.contentElem);

        this.clusterize = new Clusterize({
            rows: this.props.rows,
            scrollElem: scrollElem,
            contentElem: contentElem,
            show_no_data_row: false
        });
    }
    componentWillUnmount() {
        if (this.clusterize) {
            this.clusterize.destroy(true);
            this.clusterize = null;
        }
    }
    shouldComponentUpdate(nextProps, nextState) {
        if (nextProps.rows !== this.props.rows) {
            return true;
        }

        return false;
    }
    componentWillReceiveProps(nextProps) {
        if (nextProps.rows.length === 0) {
            this.clusterize.clear();
            return;
        }
        if (nextProps.rows !== this.props.rows) {
            this.clusterize && this.clusterize.update(nextProps.rows);
        }
        if (nextProps.scrollTop !== this.props.scrollTop) {
            this.scrollElem.scrollTop = nextProps.scrollTop;
        }
    }
    render() {
        const { className, style } = this.props;

        return (
            <div
                ref={node => {
                    this.scrollElem = node;
                }}
                className={className}
                style={{
                    height: '100%',
                    overflow: 'auto',
                    ...style
                }}
            >
                <div
                    ref={node => {
                        this.contentElem = node;
                    }}
                />
            </div>
        );
    }
}
