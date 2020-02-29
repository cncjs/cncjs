import React, { Fragment } from 'react';
import styled, { css } from 'styled-components';
import Hoverable from 'app/components/Hoverable';
import TablePagination from 'app/components/Paginations/TablePagination';
import Space from 'app/components/Space';
import i18n from 'app/lib/i18n';

const Caret = styled.i`${({
    hovered
}) => css`
    display: inline-block;
    width: 0;
    height: 0;
    vertical-align: middle;
    border-top: 4px dashed #666;
    border-right: 4px solid transparent;
    border-bottom: 0;
    border-left: 4px solid transparent;
    border-top-color: ${hovered ? '#0096cc' : '#666'};
`}`;

export default (props) => (
    <TablePagination
        {...props}
        pageRecordsRenderer={({ totalRecords, from, to }) => {
            if (totalRecords > 0) {
                return i18n._('Records: {{from}} - {{to}} / {{total}}', {
                    from,
                    to,
                    total: totalRecords
                });
            }

            return i18n._('Records: {{total}}', { total: totalRecords });
        }}
        pageLengthRenderer={({ pageLength }) => (
            <Hoverable>
                {({ hovered }) => (
                    <Fragment>
                        {i18n._('{{pageLength}} per page', { pageLength })}
                        <Space width={8} />
                        <Caret hovered={hovered} />
                    </Fragment>
                )}
            </Hoverable>
        )}
    />
);
