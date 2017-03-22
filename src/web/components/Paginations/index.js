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
                    return i18n._('Records: {{from}} - {{to}} / {{total}}', {
                        from,
                        to,
                        total: total
                    });
                }

                return i18n._('Records: {{total}}', { total: totalRecords });
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
