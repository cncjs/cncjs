import cx from 'classnames';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import isEqual from 'lodash/isEqual';
import styles from './index.styl';

class TableHeader extends Component {
    static propTypes = {
        columns: PropTypes.array,
        scrollLeft: PropTypes.number
    };

    componentDidUpdate(prevProps, prevState) {
        const { scrollLeft } = this.props;
        if (scrollLeft !== prevProps.scrollLeft) {
            this.header.scrollLeft = scrollLeft;
        }
    }

    shouldComponentUpdate(nextProps, nextState) {
        return (
            nextProps.columns.some((obj, index, array) => (typeof obj.title === 'function'))
            ||
            nextProps.scrollLeft !== this.props.scrollLeft
            ||
            !isEqual(nextProps.columns, this.props.columns)
        );
    }

    renderCell() {
        const { columns } = this.props;
        return columns.map((column, index) => {
            const key = `table_header_cell_${index}`;
            const { onClick, sortable, sortOrder, title = '' } = column;

            return (
                <div
                    key={key}
                    className={cx(
                        column.className,
                        column.headerClassName,
                        {
                            [styles.th]: true,
                            [styles.sortable]: sortable,
                            [styles.sortableHighlight]: sortable && (sortOrder === 'asc' || sortOrder === 'desc')
                        }
                    )}
                    style={{
                        ...column.style,
                        ...column.headerStyle
                    }}
                    role="button"
                    tabIndex="0"
                    onClick={onClick}
                >
                    <div className={styles.thContent}>
                        {typeof title === 'function' ? title() : title}
                        {(sortable && sortOrder === 'asc') &&
                            <i className={styles.orderAsc} />
                        }
                        {(sortable && sortOrder === 'desc') &&
                            <i className={styles.orderDesc} />
                        }
                    </div>
                </div>
            );
        });
    }

    render() {
        return (
            <div
                className={styles.thead}
                ref={node => {
                    this.header = node;
                }}
            >
                <div className={styles.tr}>
                    {this.renderCell()}
                </div>
            </div>
        );
    }
}

export default TableHeader;
