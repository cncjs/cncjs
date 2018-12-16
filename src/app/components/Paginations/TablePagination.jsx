/* eslimt react/no-set-state: 0 */
import cx from 'classnames';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Anchor from 'app/components/Anchor';
import AutosizeInput from './AutosizeInput';
import styles from './index.styl';

// Normalize the value by bringing it within the range.
// If value is greater than max, max will be returned.
// If value is less than min, min will be returned.
// Otherwise, value is returned unaltered. Both ends of this range are inclusive.
const limit = (value, min, max) => {
    return Math.max(min, Math.min(max, value));
};

class TablePagination extends PureComponent {
    static propTypes = {
        type: PropTypes.oneOf(['full', 'reduced', 'minor']),
        page: PropTypes.number,
        pageLength: PropTypes.number,
        pageLengthMenu: PropTypes.array,

        // The menu will open above the dropdown toggle, instead of below it.
        dropup: PropTypes.bool,

        totalRecords: PropTypes.number,
        onPageChange: PropTypes.func,
        prevPageRenderer: PropTypes.func,
        nextPageRenderer: PropTypes.func,
        pageRecordsRenderer: PropTypes.func,
        pageLengthRenderer: PropTypes.func
    };
    static defaultProps = {
        type: 'full',
        page: 1,
        pageLength: 10,
        pageLengthMenu: [10, 25, 50, 100],
        dropup: false,
        totalRecords: 0,
        onPageChange: () => {},
        prevPageRenderer: () => {
            return '‹';
        },
        nextPageRenderer: () => {
            return '›';
        },
        pageRecordsRenderer: ({ totalRecords, from, to }) => {
            if (totalRecords > 0) {
                return `Records: ${from} - ${to} / ${totalRecords}`;
            }

            return `Records: ${totalRecords}`;
        },
        pageLengthRenderer: ({ pageLength }) => {
            return (
                <span>
                    {`${pageLength} per page`}
                    <i className={styles.caret} />
                </span>
            );
        }
    };

    state = {
        shouldOpenDropdownMenu: false,
        page: this.props.page
    };
    actions = {
        toggleDropdownMenu: () => {
            this.setState({ shouldOpenDropdownMenu: !this.state.shouldOpenDropdownMenu });
        },
        closeDropdownMenu: () => {
            this.setState({ shouldOpenDropdownMenu: false });
        },
        changePage: (options) => {
            const totalRecords = this.props.totalRecords;
            const {
                page = this.props.page,
                pageLength = this.props.pageLength
            } = { ...options };
            const pageMin = 1;
            const pageMax = Math.max(Math.ceil(totalRecords / pageLength), 1);
            this.props.onPageChange({
                page: limit(page, pageMin, pageMax),
                pageLength
            });
        }
    };

    componentWillReceiveProps(nextProps) {
        if (nextProps.page !== this.state.page) {
            this.setState({ page: Number(nextProps.page) });
        }
    }
    render() {
        const {
            type,
            dropup,
            totalRecords = 0,
            pageLengthMenu,
            prevPageRenderer,
            nextPageRenderer,
            pageRecordsRenderer,
            pageLengthRenderer,
            className,
            ...props
        } = this.props;

        const pageLength = this.props.pageLength || pageLengthMenu[0] || 10;
        const totalPages = totalRecords > 0 ? Math.ceil(totalRecords / pageLength) : 1;
        const page = limit(this.props.page, 1, totalPages);
        const from = limit((page - 1) * pageLength + 1, 1, totalRecords);
        const to = limit((page - 1) * pageLength + pageLength, 1, totalRecords);
        const prevPageDisabled = (page <= 1);
        const nextPageDisabled = (page >= totalPages);

        delete props.pageLength;
        delete props.page;
        delete props.onPageChange;

        return (
            <div
                {...props}
                className={cx(className, styles.tablePagination)}
            >
                <div className={styles.tablePaginationBlock}>
                    <div className={styles.paginationRecords}>
                        {pageRecordsRenderer({ totalRecords, from, to })}
                    </div>
                    {(type !== 'minor') &&
                    <div
                        className={cx(
                            styles.dropdown,
                            {
                                [styles.dropup]: dropup,
                                [styles.open]: this.state.shouldOpenDropdownMenu
                            }
                        )}
                    >
                        <button
                            type="button"
                            className={styles.dropdownToggle}
                            onClick={this.actions.toggleDropdownMenu}
                            onBlur={this.actions.closeDropdownMenu}
                        >
                            {pageLengthRenderer({ pageLength })}
                        </button>
                        <ul className={styles.dropdownMenu}>
                            {pageLengthMenu.map(val => (
                                <li
                                    key={val}
                                    className={cx(
                                        { [styles.selected]: pageLength === val }
                                    )}
                                    onMouseDown={() => {
                                        this.actions.changePage({
                                            page: (val !== pageLength) ? 1 : page,
                                            pageLength: val
                                        });
                                    }}
                                    role="presentation"
                                >
                                    <Anchor>{val}</Anchor>
                                </li>
                            ))}
                        </ul>
                    </div>
                    }
                    {(type !== 'reduced' && type !== 'minor') &&
                        <div className={styles.paginationInput}>
                            <AutosizeInput
                                value={this.state.page}
                                onChange={(event) => {
                                    const page = Number(event.target.value);
                                    if (!page) {
                                        return;
                                    }
                                    this.setState({ page: limit(page, 1, totalPages) });
                                }}
                                onKeyPress={(event) => {
                                    if (event.key !== 'Enter') {
                                        return;
                                    }

                                    let { page } = this.state;
                                    page = limit(page, 1, totalPages);

                                    if (page !== this.state.page) {
                                        this.setState({ page: page });
                                    }

                                    this.actions.changePage({ page: page });
                                }}
                            />
                            &nbsp;
                            /
                            &nbsp;
                            {totalPages}
                        </div>
                    }
                    <div>
                        <ul className={styles.pagination}>
                            <li
                                className={cx({
                                    [styles.disabled]: prevPageDisabled
                                })}
                            >
                                <Anchor
                                    disabled={prevPageDisabled}
                                    onClick={(event) => {
                                        const prevPage = page > 1 ? page - 1 : page;

                                        if (prevPage !== this.state.page) {
                                            this.setState({ page: prevPage });
                                        }

                                        this.actions.changePage({ page: prevPage });
                                    }}
                                >
                                    {prevPageRenderer()}
                                </Anchor>
                            </li>
                            <li
                                className={cx({
                                    [styles.disabled]: nextPageDisabled
                                })}
                            >
                                <Anchor
                                    disabled={nextPageDisabled}
                                    onClick={(event) => {
                                        const nextPage = page < totalPages ? page + 1 : page;

                                        if (nextPage !== this.state.page) {
                                            this.setState({ page: nextPage });
                                        }

                                        this.actions.changePage({ page: nextPage });
                                    }}
                                >
                                    {nextPageRenderer()}
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
