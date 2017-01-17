import React from 'react';
import * as Paginations from '@trendmicro/react-paginations';
import '@trendmicro/react-paginations/dist/react-paginations.css';
import i18n from '../../lib/i18n';

export const TablePagination = (props) => {
    return (
        <Paginations.TablePagination
            {...props}
            pageRecordsRenderer={({ totalRecords, from, to }) => {
                if (totalRecords > 0) {
                    return i18n._('Records: {{from}} - {{to}} / {{totalRecords}}', { totalRecords, from, to });
                }

                return i18n._('Records: {{totalRecords}}', { totalRecords });
            }}
            pageLengthRenderer={({ pageLength }) => (
                <span>
                    {i18n._('{{pageLength}} per page', { pageLength })}
                    <i className="caret" />
                </span>
            )}
        />
    );
};
