import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import styles from './index.styl';
import TableRow from './TableRow';

class TableBody extends PureComponent {
    static propTypes = {
        columns: PropTypes.array,
        hoveredRowKey: PropTypes.any,
        expandedRowKeys: PropTypes.array,
        expandedRowRender: PropTypes.func,
        emptyText: PropTypes.func,
        loading: PropTypes.bool,
        onMouseOver: PropTypes.func,
        onTouchStart: PropTypes.func,
        onScroll: PropTypes.func,
        onRowHover: PropTypes.func,
        onRowClick: PropTypes.func,
        records: PropTypes.array,
        rowClassName: PropTypes.func,
        rowKey: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
        scrollTop: PropTypes.number,
        store: PropTypes.any, // mini-store
        tableRole: PropTypes.string, // present fixed left table or normal table
        scrollLeft: PropTypes.number // From table body HOC
    };

    static defaultProps = {
        emptyText: () => {
            return 'No Data';
        },
        onMouseOver: () => {},
        onTouchStart: () => {},
        onScroll: () => {},
        records: [],
        rowKey: 'key',
        rowClassName: () => {}
    };

    componentDidMount() {
        const { onMouseOver, onTouchStart } = this.props;
        this.body.addEventListener('mouseover', onMouseOver);
        this.body.addEventListener('touchstart', onTouchStart);
    }
    componentWillUnmount() {
        const { onMouseOver, onTouchStart } = this.props;
        this.body.removeEventListener('mouseover', onMouseOver);
        this.body.removeEventListener('touchstart', onTouchStart);
    }

    componentDidUpdate(prevProps, prevState) {
        if (this.props.scrollTop !== prevProps.scrollTop) {
            const { scrollTop } = this.props;
            if (this.body.scrollTop !== scrollTop) {
                this.body.scrollTop = scrollTop;
            }
        }
    }

    onScroll = (e) => {
        e.stopPropagation();
        const { store, tableRole, scrollLeft } = this.props;
        store.setState({
            scrollTop: e.target.scrollTop,
            scrollLeft: tableRole === 'leftTable' ? scrollLeft : e.target.scrollLeft
        });
    };

    getRowKey (record, index) {
        const rowKey = this.props.rowKey;
        let key = (typeof rowKey === 'function' ? rowKey(record, index) : record[rowKey]);
        return key === undefined ? `table_row_${index}` : key;
    }

    render() {
        const {
            columns,
            expandedRowKeys,
            expandedRowRender,
            emptyText,
            loading,
            onRowHover,
            onRowClick,
            records,
            rowClassName
        } = this.props;
        const noData = (!records || records.length === 0);
        return (
            <div
                className={styles.tbody}
                ref={node => {
                    this.body = node;
                }}
                onScroll={this.onScroll}
            >
                {
                    records.map((row, index) => {
                        const key = this.getRowKey(row, index);
                        const className = rowClassName(row, key);
                        return (
                            <TableRow
                                columns={columns}
                                expandedRowKeys={expandedRowKeys}
                                expandedRowRender={expandedRowRender}
                                rowKey={key}
                                rowIndex={index}
                                key={key}
                                onHover={onRowHover}
                                onRowClick={onRowClick}
                                record={row}
                                className={className}
                            />
                        );
                    })
                }
                {
                    noData && !loading &&
                    <div className={styles.tablePlaceholder}>
                        { emptyText() }
                    </div>
                }
                {
                    noData && loading &&
                    <div className={styles.tableNoDataLoader} />
                }
            </div>
        );
    }
}

export default TableBody;
