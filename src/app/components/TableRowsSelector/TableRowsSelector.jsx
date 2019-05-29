import ensureArray from 'ensure-array';
import _difference from 'lodash/difference';
import _get from 'lodash/get';
import _includes from 'lodash/includes';
import _union from 'lodash/union';
import PropTypes from 'prop-types';
import React from 'react';
import { Checkbox } from 'app/components/Checkbox';

class TableRowsSelector extends React.Component {
    static propTypes = {
        rows: PropTypes.array,
        rowKey: PropTypes.oneOfType([
            PropTypes.func,
            PropTypes.string,
            PropTypes.array,
        ]),
        children: PropTypes.func.isRequired,
    };

    static defaultProps = {
        rows: [],
        rowKey: 'id',
    }

    constructor(props) {
        super(props);
        this.state = {
            selectedRowKeys: [],
        };
    }

    getRowKey = (row) => {
        if (!row) {
            return undefined;
        }

        if (typeof this.props.rowKey === 'function') {
            return this.props.rowKey(row);
        }

        return _get(row, this.props.rowKey);
    };

    clearSelectedRows = () => {
        this.setState({ selectedRowKeys: [] });
    };

    selectRows = (rows) => {
        const selectRowKeys = ensureArray(rows).map(row => this.getRowKey(row));
        this.setState(state => ({
            selectedRowKeys: _union(
                state.selectedRowKeys,
                selectRowKeys
            )
        }));
    };

    deselectRows = (rows) => {
        const deselectRowKeys = ensureArray(rows).map(row => this.getRowKey(row));
        this.setState(state => ({
            selectedRowKeys: _difference(
                state.selectedRowKeys,
                deselectRowKeys
            )
        }));
    };

    isRowSelected = (row) => {
        const rowKey = this.getRowKey(row);
        const { selectedRowKeys } = this.state;
        return _includes(selectedRowKeys, rowKey);
    };

    toggleRowSelectionByRowKey = (rowKey) => {
        this.setState(state => {
            const { selectedRowKeys } = state;
            const isRowSelected = _includes(selectedRowKeys, rowKey);
            return {
                selectedRowKeys: isRowSelected
                    ? selectedRowKeys.filter(selectedRowKey => selectedRowKey !== rowKey)
                    : selectedRowKeys.concat(rowKey)
            };
        });
    };

    handleToggleRowSelectionByRowKey = (rowKey) => (e) => {
        e.stopPropagation();
        this.toggleRowSelectionByRowKey(rowKey);
    };

    handleClickHeaderCheckbox = (e) => {
        const { checked, indeterminate } = e.target;
        const { rows } = this.props;
        const selectAll = (!checked && indeterminate) || checked;
        this.setState({
            selectedRowKeys: selectAll ? ensureArray(rows).map(row => this.getRowKey(row)) : []
        });
    };

    renderHeaderCheckbox = () => {
        const { rows } = this.props;
        const { selectedRowKeys } = this.state;
        const selectableCount = ensureArray(rows).length;
        const selectedCount = selectedRowKeys.length;
        const allSelected = (selectableCount > 0) && (selectedCount > 0) && (selectedCount >= selectableCount);
        const partiallySelected = (selectedCount > 0) && (selectedCount < selectableCount);
        return (
            <Checkbox
                checked={allSelected || partiallySelected}
                disabled={selectableCount === 0}
                indeterminate={partiallySelected}
                onClick={this.handleClickHeaderCheckbox}
            />
        );
    };

    renderCellCheckbox = (value, row) => {
        const rowKey = this.getRowKey(row);
        const checked = _includes(this.state.selectedRowKeys, rowKey);
        const handleClick = this.handleToggleRowSelectionByRowKey(rowKey);
        return (
            <Checkbox
                checked={checked}
                onClick={handleClick}
            />
        );
    };

    render() {
        const { rows, children } = this.props;

        if (typeof children === 'function') {
            return children({
                selectedRowKeys: this.state.selectedRowKeys,
                selectedRows: ensureArray(rows).filter(row => _includes(this.state.selectedRowKeys, this.getRowKey(row))),
                clearSelectedRows: this.clearSelectedRows,
                selectRows: this.selectRows,
                deselectRows: this.deselectRows,
                isRowSelected: this.isRowSelected,
                renderHeaderCheckbox: this.renderHeaderCheckbox,
                renderCellCheckbox: this.renderCellCheckbox,
            });
        }

        return null;
    }
}

export default TableRowsSelector;
