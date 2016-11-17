/* eslimt react/no-set-state: 0 */
import classNames from 'classnames';
import React, { Component, PropTypes } from 'react';
import CSSModules from 'react-css-modules';
import Dropdown from 'react-bootstrap/lib/Dropdown';
import MenuItem from 'react-bootstrap/lib/MenuItem';
import Anchor from '../Anchor';
import i18n from '../../lib/i18n';
import * as normalizeRange from '../../lib/normalize-range';
import styles from './index.styl';

const noop = () => {};

const CustomToggle = (props) => {
    const handleClick = (event) => {
        event.preventDefault();
        props.onClick(event);
    };

    return (
        <Anchor {...props} onClick={handleClick} />
    );
};
CustomToggle.propTypes = Dropdown.Toggle.propTypes;

@CSSModules(styles, { allowMultiple: true })
class TablePagination extends Component {
    static propTypes = {
        type: PropTypes.oneOf(['full', 'reduced', 'minor']),
        lengthMenu: PropTypes.array,
        page: PropTypes.number,
        pageLength: PropTypes.number,
        totalRecords: PropTypes.number,
        onPageChange: PropTypes.func,
        recordsText: PropTypes.func,
        pageLengthText: PropTypes.func
    };
    static defaultProps = {
        type: 'full',
        lengthMenu: [10, 25, 50, 100],
        page: 1,
        pageLength: 10,
        totalRecords: 0,
        onPageChange: noop,
        recordsText: ({ totalRecords, from, to }) => {
            if (totalRecords > 0) {
                return i18n._('Records: {{from}} - {{to}} / {{total}}', { from, to, total: totalRecords });
            }

            return i18n._('Records: {{total}}', { total: totalRecords });
        },
        pageLengthText: ({ pageLength }) => {
            return i18n._('{{pageLength}} per page', { pageLength: pageLength });
        }
    };

    constructor(props) {
        super(props);
        this.state = this.getDefaultState();
    }
    componentWillReceiveProps(nextProps) {
        if (nextProps.page !== this.state.page) {
            this.setState({ page: Number(nextProps.page) });
        }
    }
    getDefaultState() {
        return {
            page: this.props.page
        };
    }
    handlePageChange(options) {
        const {
            page = this.props.page,
            pageLength = this.props.pageLength
        } = { ...options };

        this.props.onPageChange({ page, pageLength });
    }
    render() {
        const { type, totalRecords = 0, lengthMenu } = this.props;
        const pageLength = this.props.pageLength || lengthMenu[0] || 10;
        const totalPages = totalRecords > 0 ? Math.ceil(totalRecords / pageLength) : 1;
        const page = normalizeRange.limit(this.props.page, 1, totalPages);
        const from = normalizeRange.limit((page - 1) * pageLength + 1, 1, totalRecords);
        const to = normalizeRange.limit((page - 1) * pageLength + pageLength, 1, totalRecords);
        const lengthMenuItems = lengthMenu.map(length => {
            return (
                <MenuItem
                    active={pageLength === length}
                    eventKey={length}
                    key={length}
                >
                    {length}
                </MenuItem>
            );
        });
        const prevPageDisabled = (page <= 1);
        const nextPageDisabled = (page >= totalPages);

        return (
            <div
                {...this.props}
                styleName="table-pagination"
            >
                <div styleName="table-pagination-block">
                    <div styleName="pagination-records">
                        {this.props.recordsText({ totalRecords, from, to })}
                    </div>
                    {(type !== 'minor') &&
                    <Dropdown
                        id="table-pagination-dropdown"
                        pullRight
                        styleName="dropdown"
                        onSelect={(eventKey, event) => {
                            const pageLength = Number(eventKey);
                            this.handlePageChange({ pageLength: pageLength });
                        }}
                    >
                        <CustomToggle
                            bsRole="toggle"
                            styleName="btn"
                        >
                            {this.props.pageLengthText({ pageLength })}
                            <i styleName="caret" />
                        </CustomToggle>
                        <Dropdown.Menu>
                            {lengthMenuItems}
                        </Dropdown.Menu>
                    </Dropdown>
                    }
                    {(type !== 'reduced' && type !== 'minor') &&
                    <div styleName="pagination-input">
                        <input
                            value={this.state.page}
                            onChange={(event) => {
                                const page = Number(event.target.value);
                                if (isNaN(page)) {
                                    return;
                                }
                                this.setState({ page: normalizeRange.limit(page, 1, totalPages) });
                            }}
                            onKeyPress={(event) => {
                                if (event.key !== 'Enter') {
                                    return;
                                }

                                let { page } = this.state;
                                page = normalizeRange.limit(page, 1, totalPages);

                                if (page !== this.state.page) {
                                    this.setState({ page: page });
                                }

                                this.handlePageChange({ page: page });
                            }}
                        />
                        &nbsp;
                        /
                        &nbsp;
                        {totalPages}
                    </div>
                    }
                    <div styleName="pagination">
                        <ul>
                            <li styleName={classNames({ 'disabled': prevPageDisabled })}>
                                <Anchor
                                    disabled={prevPageDisabled}
                                    onClick={(event) => {
                                        const prevPage = page > 1 ? page - 1 : page;

                                        if (prevPage !== this.state.page) {
                                            this.setState({ page: prevPage });
                                        }

                                        this.handlePageChange({ page: prevPage });
                                    }}
                                >
                                    <span className="fa fa-angle-left" aria-hidden="true" />
                                </Anchor>
                            </li>
                            <li styleName={classNames({ 'disabled': nextPageDisabled })}>
                                <Anchor
                                    disabled={nextPageDisabled}
                                    onClick={(event) => {
                                        const nextPage = page < totalPages ? page + 1 : page;

                                        if (nextPage !== this.state.page) {
                                            this.setState({ page: nextPage });
                                        }

                                        this.handlePageChange({ page: nextPage });
                                    }}
                                >
                                    <span className="fa fa-angle-right" aria-hidden="true" />
                                </Anchor>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        );
    }
}

export default TablePagination;
