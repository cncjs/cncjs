import classNames from 'classnames';
import colornames from 'colornames';
import React from 'react';
import DataGrid from 'react-datagrid';
import i18n from '../../../lib/i18n';
import { GCODE_STATUS } from './constants';

const columns = [
    {
        name: 'status',
        width: 22,
        style: {
            backgroundColor: colornames('gray 95')
        },
        render: (value) => {
            const classes = {
                icon: classNames(
                    'fa',
                    { 'fa-check': value !== GCODE_STATUS.ERROR },
                    { 'fa-ban': value === GCODE_STATUS.ERROR }
                )
            };
            const styles = {
                icon: {
                    color: (() => {
                        const color = {};
                        color[GCODE_STATUS.ERROR] = colornames('indian red');
                        color[GCODE_STATUS.NOT_STARTED] = colornames('gray 80');
                        color[GCODE_STATUS.IN_PROGRESS] = colornames('gray 80');
                        color[GCODE_STATUS.COMPLETED] = colornames('gray 20');
                        return color[value] || colornames('gray 80');
                    })()
                }
            };

            return <i className={classes.icon} style={styles.icon}></i>;
        }
    },
    {
        name: 'cmd',
        render: (value, data, cellProps) => {
            const { rowIndex } = cellProps;
            const style = {
                backgroundColor: colornames('gray 25'),
                marginRight: 5
            };

            return (
                <div>
                    <span className="label" style={style}>{rowIndex + 1}</span>{value}
                </div>
            );
        }
    }
];

class GCodeTable extends React.Component {
    static propTypes = {
        height: React.PropTypes.number,
        rowHeight: React.PropTypes.number,
        data: React.PropTypes.array,
        scrollTo: React.PropTypes.number
    };
    static defaultProps = {
        height: 180,
        rowHeight: 30,
        data: [],
        scrollTo: 0
    };

    render() {
        const { data, height, rowHeight } = this.props;

        return (
            <div className="gcode-table">
                <DataGrid
                    className="hide-header"
                    ref="dataGrid"
                    idProperty="id"
                    dataSource={data}
                    columns={columns}
                    emptyText={i18n._('No data to display')}
                    rowHeight={rowHeight}
                    style={{ height }}
                    withColumnMenu={false}
                    showCellBorders={true}
                />
            </div>
        );
    }
}

export default GCodeTable;
