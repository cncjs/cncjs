import _ from 'lodash';
import classNames from 'classnames';
import colornames from 'colornames';
import React from 'react';
import update from 'react-addons-update';
import DataGrid from 'react-datagrid';
import i18n from '../../../lib/i18n';
import { GCODE_STATUS } from './constants';

const columns = [
    {
        name: 'id',
        width: 'auto',

        render: (value, data, cellProps) => {
            const { rowIndex } = cellProps;
            const style = {
                backgroundColor: colornames('gray 25')
            };

            return <span className="label" style={style}>{rowIndex + 1}</span>;
        }
    },
    {
        name: 'status',
        width: 'auto',
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
                    color: ((value) => {
                        let color = {};
                        color[GCODE_STATUS.ERROR] = colornames('indian red');
                        color[GCODE_STATUS.NOT_STARTED] = colornames('gray 80');
                        color[GCODE_STATUS.IN_PROGRESS] = colornames('gray 80');
                        color[GCODE_STATUS.COMPLETED] = colornames('gray 20');
                        return color[value] || colornames('gray 80');
                    })(value)
                }
            };

            return <i className={classes.icon} style={styles.icon}></i>;
        }
    },
    {
        name: 'cmd'
    }
];

class GCodeTable extends React.Component {
    static propTypes = {
        height: React.PropTypes.number,
        rowHeight: React.PropTypes.number,
        data: React.PropTypes.array,
        scrollToLine: React.PropTypes.number
    };
    static defaultProps = {
        height: 180,
        rowHeight: 30,
        data: [],
        scrollToLine: 0
    };

    render() {
        const { data, height, rowHeight, scrollToLine } = this.props;
        const outerStyle = {
            borderWidth: 1,
            borderStyle: 'solid',
            borderColor: colornames('gray 80')
        };

        return (
            <div className="gcode-table" style={outerStyle}>
                <DataGrid
                    className="hide-header"
                    ref="dataGrid"
                    idProperty="id"
                    dataSource={data}
                    columns={columns}
                    emptyText={i18n._('No data to display')}
                    rowHeight={rowHeight}
                    style={{height: height}}
                    withColumnMenu={false}
                    scrollBy={scrollToLine}
                />
            </div>
        );
    }
}

export default GCodeTable;
