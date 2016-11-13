import classNames from 'classnames';
import React, { Component, PropTypes } from 'react';
import RCTable from 'rc-table';
import i18n from '../../lib/i18n';
import styles from './index.styl';

const renderWithTooltip = (value, tooltip) => {
    if (typeof value === 'string') {
        tooltip = value;
    }
    return (<div className="overflow-ellipsis" title={tooltip}>{value}</div>);
};

class Table extends Component {
    static propTypes = {
        ...RCTable.propTypes,
        title: PropTypes.func,
        footer: PropTypes.func,
        border: PropTypes.bool,
        loading: PropTypes.bool
    };
    static defaultProps = {
        ...RCTable.defaultProps,
        border: true,
        loading: false
    };

    render() {
        const {
            className,
            title,
            footer,
            border,
            loading,
            data,
            ...props
        } = this.props;

        // default render field value with tooltip
        props.columns = props.columns.map((obj) => {
            obj.render = obj.render || renderWithTooltip;
            obj.title = renderWithTooltip(obj.title);
            return obj;
        });

        return (
            <RCTable
                {...props}
                className={classNames(
                    className,
                    { 'no-border': !border },
                    styles.table,
                    { [styles.noBorder]: !border }
                )}
                title={title}
                footer={footer}
                data={loading ? [] : data}
                emptyText={() => {
                    if (loading) {
                        return i18n._('Loading...');
                    }

                    return i18n._('No data to display');
                }}
            />
        );
    }
}

export default Table;
