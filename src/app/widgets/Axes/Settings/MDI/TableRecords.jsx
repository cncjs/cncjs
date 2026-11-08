import {
  Box,
  Button,
  ButtonGroup,
  Space,
  Spinner,
  Table,
  TableHeader,
  TableHeaderRow,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
} from '@tonic-ui/react';
import get from 'lodash/get';
import take from 'lodash/take';
import React from 'react';
import { AddIcon, ChevronUpIcon, ChevronDownIcon, EditIcon, CloseIcon } from '@tonic-ui/react-icons';
import i18n from '@app/lib/i18n';

/**
 * @param {{ numerator: number, denominator: number }} props
 * @returns {JSX.Element}
 */
const Fraction = ({ numerator, denominator }) => (
  <Box sx={{ display: 'inline-flex', alignItems: 'baseline' }}>
    <Box
      as="sup"
      sx={{ display: 'inline', fontSize: '0.75em', lineHeight: 0, position: 'relative', top: '-0.5em' }}
    >
      {numerator}
    </Box>
    <Box sx={{ display: 'inline', lineHeight: 1 }}>/</Box>
    <Box
      as="sub"
      sx={{ display: 'inline', fontSize: '0.75em', lineHeight: 0, position: 'relative', bottom: '-0.25em' }}
    >
      {denominator}
    </Box>
  </Box>
);

const GRID_LABELS = {
  1: <Fraction numerator={1} denominator={12} />,
  2: <Fraction numerator={1} denominator={6} />,
  3: <Fraction numerator={1} denominator={4} />,
  4: <Fraction numerator={1} denominator={3} />,
  5: <Fraction numerator={5} denominator={12} />,
  6: <Fraction numerator={1} denominator={2} />,
  7: <Fraction numerator={7} denominator={12} />,
  8: <Fraction numerator={2} denominator={3} />,
  9: <Fraction numerator={3} denominator={4} />,
  10: <Fraction numerator={5} denominator={6} />,
  11: <Fraction numerator={11} denominator={12} />,
  12: '100%',
};

/**
 * @param {{
 *   records: Array<Record<string, unknown>>,
 *   loading?: boolean,
 *   error?: boolean,
 *   onMove: (from: number, to: number) => void,
 *   onCreate: () => void,
 *   onUpdate: (record: Record<string, unknown>) => void,
 *   onRemove: (id: string) => void
 * }} props
 * @returns {JSX.Element}
 */
function TableRecords({
  records,
  loading = false,
  error = false,
  onMove,
  onCreate,
  onUpdate,
  onRemove,
}) {
  const columns = [
    {
      title: i18n._('Order'),
      className: 'text-nowrap',
      key: 'order',
      width: 80,
      render: (value, row, rowIndex) => (
        <ButtonGroup>
          <Button
            size="sm"
            disabled={rowIndex === 0}
            aria-label={i18n._('Move Up')}
            title={i18n._('Move Up')}
            onClick={() => onMove(rowIndex, rowIndex - 1)}
          >
            <ChevronUpIcon />
          </Button>
          <Button
            size="sm"
            disabled={rowIndex === records.length - 1}
            aria-label={i18n._('Move Down')}
            title={i18n._('Move Down')}
            onClick={() => onMove(rowIndex, rowIndex + 1)}
          >
            <ChevronDownIcon />
          </Button>
        </ButtonGroup>
      ),
    },
    {
      title: i18n._('Name'),
      className: 'text-nowrap',
      key: 'name',
      dataKey: 'name',
    },
    {
      title: i18n._('Command'),
      key: 'command',
      render: (value, row) => {
        const sx = { background: 'inherit', border: 'none', margin: 0, padding: 0 };
        const lines = String(row.command).split('\n');
        const limit = 4;

        if (lines.length > limit) {
          return (
            <Box as="pre" sx={sx}>
              {take(lines, limit).join('\n')}
              {'\n'}
              {i18n._('and more...')}
            </Box>
          );
        }

        return <Box as="pre" sx={sx}>{row.command}</Box>;
      },
    },
    {
      title: i18n._('Button Width'),
      className: 'text-nowrap',
      key: 'grid.xs',
      render: (value, row) => GRID_LABELS[get(row, 'grid.xs')] || '–',
    },
    {
      title: i18n._('Action'),
      className: 'text-nowrap',
      key: 'action',
      width: 90,
      render: (value, row) => (
        <Box>
          <Button
            size="sm"
            aria-label={i18n._('Update')}
            title={i18n._('Update')}
            onClick={() => onUpdate(row)}
          >
            <EditIcon />
          </Button>
          <Button
            size="sm"
            aria-label={i18n._('Remove')}
            title={i18n._('Remove')}
            onClick={() => onRemove(row.id)}
          >
            <CloseIcon />
          </Button>
        </Box>
      ),
    },
  ];
  return (
    <Box>
      <Button onClick={onCreate} mb="2x"><AddIcon /><Space width="2x" />{i18n._('New')}</Button>
      <Box maxHeight={300} overflow="auto">
        <Table layout="table">
          <TableHeader sx={{ position: 'sticky', top: 0, zIndex: 1 }}>
            <TableHeaderRow>
              {columns.map(column => (
                <TableHeaderCell key={column.key} width={column.width} whiteSpace="nowrap">
                  {column.title}
                </TableHeaderCell>
              ))}
            </TableHeaderRow>
          </TableHeader>
          <TableBody>
            {!error && !loading && records.map((record, rowIndex) => (
              <TableRow key={record.id}>
                {columns.map(column => (
                  <TableCell key={column.key} whiteSpace={column.className === 'text-nowrap' ? 'nowrap' : undefined}>
                    {column.render ? column.render(get(record, column.dataKey), record, rowIndex) : get(record, column.dataKey)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {error && <Box role="alert" color="error.text">{i18n._('An unexpected error has occurred.')}</Box>}
        {!error && loading && <Box role="status"><Spinner /><Space width="2x" />{i18n._('Loading...')}</Box>}
        {!error && !loading && records.length === 0 && <Box>{i18n._('No data to display')}</Box>}
      </Box>
    </Box>
  );
}

export default TableRecords;
