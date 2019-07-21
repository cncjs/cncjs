import ensureArray from 'ensure-array';
import _difference from 'lodash/difference';
import _get from 'lodash/get';
import _includes from 'lodash/includes';
import _union from 'lodash/union';
import PropTypes from 'prop-types';
import React from 'react';

class RowsHelper extends React.Component {
    static propTypes = {
        rows: PropTypes.array,
        rowKey: PropTypes.oneOfType([
            PropTypes.func,
            PropTypes.string,
            PropTypes.array,
        ]),
        rowExpandableKey: PropTypes.oneOfType([
            PropTypes.func,
            PropTypes.string,
            PropTypes.array,
        ]),
        rowSelectableKey: PropTypes.oneOfType([
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
            expandedRowKeys: [],
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

    //
    // Expand / Collapse
    //

    getRowExpandableKey = (row) => {
        if (!row) {
            return undefined;
        }

        if (typeof this.props.rowExpandableKey === 'function') {
            return this.props.rowExpandableKey(row);
        }

        return _get(row, this.props.rowExpandableKey);
    };

    clearExpandedRows = () => {
        this.setState({ expandedRowKeys: [] });
    };

    expandRows = (rows) => {
        const expandRowKeys = ensureArray(rows)
            .filter(row => this.isRowExpandable(row))
            .map(row => this.getRowKey(row));

        this.setState(state => ({
            expandedRowKeys: _union(
                state.expandedRowKeys,
                expandRowKeys
            )
        }));
    };

    collapseRows = (rows) => {
        const collapseRowKeys = ensureArray(rows)
            .filter(row => this.isRowExpandable(row))
            .map(row => this.getRowKey(row));

        this.setState(state => ({
            expandedRowKeys: _difference(
                state.expandedRowKeys,
                collapseRowKeys
            )
        }));
    };

    isRowExpandable = (row) => {
        if (this.props.rowExpandableKey === undefined) {
            return true;
        }

        const rowExpandableKey = this.getRowExpandableKey(row);

        return !!rowExpandableKey;
    };

    isRowExpanded = (row) => {
        const rowKey = this.getRowKey(row);
        const { expandedRowKeys } = this.state;
        return _includes(expandedRowKeys, rowKey);
    };

    toggleRowExpandedByRowKey = (rowKey) => {
        this.setState(state => {
            const { expandedRowKeys } = state;
            const isRowExpanded = _includes(expandedRowKeys, rowKey);
            return {
                expandedRowKeys: isRowExpanded
                    ? expandedRowKeys.filter(expandedRowKey => expandedRowKey !== rowKey)
                    : expandedRowKeys.concat(rowKey)
            };
        });
    };

    handleToggleRowExpandedByRowKey = (rowKey) => (e) => {
        if (typeof e === 'object' && typeof e.stopPropagation === 'function') {
            e.stopPropagation();
        }

        this.toggleRowExpandedByRowKey(rowKey);
    };

    ExpandRenderer = ({ row, children }) => {
        const rowKey = this.getRowKey(row);
        const disabled = !this.isRowExpandable(row);
        const expanded = _includes(this.state.expandedRowKeys, rowKey);
        const handleClick = this.handleToggleRowExpandedByRowKey(rowKey);

        if (typeof children !== 'function') {
            return null;
        }

        return children({ rowKey, disabled, expanded, handleClick });
    };

    ExpandAllRenderer = ({ children }) => {
        const { rows } = this.props;
        const { expandedRowKeys } = this.state;
        const expandableRows = ensureArray(rows)
            .filter(row => this.isRowExpandable(row));
        const expandableCount = expandableRows.length;
        const expandedCount = expandedRowKeys.length;
        const allExpanded = (expandableCount > 0) && (expandedCount > 0) && (expandedCount >= expandableCount);
        const partiallyExpanded = (expandedCount > 0) && (expandedCount < expandableCount);
        const handleClick = this.handleClickSelectAllRows;

        if (typeof children !== 'function') {
            return null;
        }

        return children({ allExpanded, partiallyExpanded, expandableCount, expandedCount, handleClick });
    };

    //
    // Select / Deselect
    //

    getRowSelectableKey = (row) => {
        if (!row) {
            return undefined;
        }

        if (typeof this.props.rowSelectableKey === 'function') {
            return this.props.rowSelectableKey(row);
        }

        return _get(row, this.props.rowSelectableKey);
    };

    clearSelectedRows = () => {
        this.setState({ selectedRowKeys: [] });
    };

    selectRows = (rows) => {
        const selectRowKeys = ensureArray(rows)
            .filter(row => this.isRowSelectable(row))
            .map(row => this.getRowKey(row));

        this.setState(state => ({
            selectedRowKeys: _union(
                state.selectedRowKeys,
                selectRowKeys
            )
        }));
    };

    deselectRows = (rows) => {
        const deselectRowKeys = ensureArray(rows)
            .filter(row => this.isRowSelectable(row))
            .map(row => this.getRowKey(row));

        this.setState(state => ({
            selectedRowKeys: _difference(
                state.selectedRowKeys,
                deselectRowKeys
            )
        }));
    };

    isRowSelectable = (row) => {
        if (this.props.rowSelectableKey === undefined) {
            return true;
        }

        const rowSelectableKey = this.getRowSelectableKey(row);

        return !!rowSelectableKey;
    };

    isRowSelected = (row) => {
        const rowKey = this.getRowKey(row);
        const { selectedRowKeys } = this.state;
        return _includes(selectedRowKeys, rowKey);
    };

    toggleRowSelectedByRowKey = (rowKey) => {
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

    handleToggleRowSelectedByRowKey = (rowKey) => (e) => {
        if (typeof e === 'object' && typeof e.stopPropagation === 'function') {
            e.stopPropagation();
        }

        this.toggleRowSelectedByRowKey(rowKey);
    };

    handleClickSelectAllRows = (e) => {
        const { checked, indeterminate } = e.target;
        const { rows } = this.props;
        const selectAll = (!checked && indeterminate) || checked;
        if (selectAll) {
            const selectedRowKeys = ensureArray(rows)
                .filter(row => this.isRowSelectable(row))
                .map(row => this.getRowKey(row));
            this.setState({ selectedRowKeys });
        } else {
            this.setState({ selectedRowKeys: [] });
        }
    };

    SelectRenderer = ({ row, children }) => {
        const rowKey = this.getRowKey(row);
        const disabled = !this.isRowSelectable(row);
        const checked = _includes(this.state.selectedRowKeys, rowKey);
        const handleClick = this.handleToggleRowSelectedByRowKey(rowKey);

        if (typeof children !== 'function') {
            return null;
        }

        return children({ rowKey, disabled, checked, handleClick });
    };

    SelectAllRenderer = ({ children }) => {
        const { rows } = this.props;
        const { selectedRowKeys } = this.state;
        const selectableRows = ensureArray(rows)
            .filter(row => this.isRowSelectable(row));
        const selectableCount = selectableRows.length;
        const selectedCount = selectedRowKeys.length;
        const allSelected = (selectableCount > 0) && (selectedCount > 0) && (selectedCount >= selectableCount);
        const partiallySelected = (selectedCount > 0) && (selectedCount < selectableCount);
        const handleClick = this.handleClickSelectAllRows;

        if (typeof children !== 'function') {
            return null;
        }

        return children({ allSelected, partiallySelected, selectableCount, selectedCount, handleClick });
    };

    render() {
        const { rows, children } = this.props;

        if (typeof children === 'function') {
            return children({
                // Expand / Collapse
                expandedRowKeys: this.state.expandedRowKeys,
                expandedRows: ensureArray(rows).filter(row => _includes(this.state.expandedRowKeys, this.getRowKey(row))),
                clearExpandedRows: this.clearExpandedRows,
                expandRows: this.expandRows,
                collapseRows: this.collapseRows,
                isRowExpandable: this.isRowExpandable,
                isRowExpanded: this.isRowExpanded,
                ExpandRenderer: this.ExpandRenderer, // expand a row
                ExpandAllRenderer: this.ExpandAllRenderer, // expand all rows

                // Select / Deselect
                selectedRowKeys: this.state.selectedRowKeys,
                selectedRows: ensureArray(rows).filter(row => _includes(this.state.selectedRowKeys, this.getRowKey(row))),
                clearSelectedRows: this.clearSelectedRows,
                selectRows: this.selectRows,
                deselectRows: this.deselectRows,
                isRowSelectable: this.isRowSelectable,
                isRowSelected: this.isRowSelected,
                SelectRenderer: this.SelectRenderer, // select a row
                SelectAllRenderer: this.SelectAllRenderer, // select all rows
            });
        }

        return null;
    }
}

export default RowsHelper;
