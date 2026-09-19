import React from 'react';
import { Cell, HeaderCell, Table } from './styles';

/**
 * A small grid of machine readings.
 *
 * Deliberately dumb: a list of headings, a list of rows and an alignment per
 * column. Anything cleverer
 * — sorting, selection, column configuration — is not something any screen has
 * asked for, and a table component that guesses at those is a component nobody
 * can read.
 */
const DataTable = ({ headings, rows, align = [], ...props }) => (
  <Table {...props}>
    <thead>
      <tr>
        {headings.map((heading, index) => (
          <HeaderCell key={heading} scope="col" align={align[index]}>{heading}</HeaderCell>
        ))}
      </tr>
    </thead>
    <tbody>
      {rows.map((row, rowIndex) => (
        <tr key={row[0] !== undefined ? String(row[0]) : rowIndex}>
          {row.map((value, cellIndex) => (
            <Cell key={headings[cellIndex]} align={align[cellIndex]}>{value}</Cell>
          ))}
        </tr>
      ))}
    </tbody>
  </Table>
);

export default DataTable;
