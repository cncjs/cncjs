import {
  Button,
  ButtonBase,
  Checkbox,
  Flex,
  Icon,
  Tooltip,
} from '@tonic-ui/react';
import { EditIcon, RefreshIcon } from '@tonic-ui/react-icons';
import React, { useMemo } from 'react';
import BaseTable from '@app/components/BaseTable';
import i18n from '@app/lib/i18n';

const data = [
  { id: 1, enabled: true, title: 'G28', mtime: '2020-01-01 00:00:00', commands: 'xxx' },
  { id: 2, enabled: true, title: 'G29', mtime: '2020-01-01 00:00:00', commands: 'yyy' },
  { id: 3, enabled: true, title: 'G30', mtime: '2020-01-01 00:00:00', commands: 'zzz' },
  { id: 4, enabled: true, title: 'G31', mtime: '2020-01-01 00:00:00', commands: 'xxx' },
  { id: 5, enabled: true, title: 'G32', mtime: '2020-01-01 00:00:00', commands: 'yyy' },
  { id: 6, enabled: true, title: 'G33', mtime: '2020-01-01 00:00:00', commands: 'zzz' },
];

const Commands = () => {
  const columns = useMemo(() => ([
    {
      id: 'selection',
      header: ({ table }) => (
        <Flex alignItems="center" justifyContent="center">
          <Checkbox
            checked={table.getIsAllRowsSelected()}
            indeterminate={table.getIsSomeRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        </Flex>
      ),
      cell: ({ row }) => (
        <Flex alignItems="center" justifyContent="center">
          <Checkbox
            checked={row.getIsSelected()}
            indeterminate={row.getIsSomeSelected()}
            onChange={row.getToggleSelectedHandler()}
          />
        </Flex>
      ),
      size: 48,
    },
    {
      header: i18n._('Description'),
      accessorKey: 'title',
      size: 'auto',
    },
    {
      header: i18n._('Commands'),
      accessorKey: 'commands',
      size: 'auto',
    },
    {
      header: i18n._('Date Modified'),
      accessorKey: 'mtime',
      size: 180,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <ButtonBase>
          <Icon as={EditIcon} />
        </ButtonBase>
      ),
      size: 48,
    },
  ]), []);

  return (
    <Flex
      flexDirection="column"
      height="100%"
    >
      <Flex
        alignItems="flex-start"
        justifyContent="space-between"
        columnGap="6x"
        pt="4x"
        pb="2x"
        px="4x"
      >
        <Flex
          flexWrap="wrap"
          alignItems="center"
          columnGap="2x"
          rowGap="2x"
        >
          <Button variant="primary">
            Add
          </Button>
          <Button variant="secondary">
            Remove
          </Button>
        </Flex>
        <Flex
          flexWrap="nowrap"
          alignItems="center"
          columnGap="2x"
        >
          <Tooltip label={i18n._('Refresh')}>
            <Button variant="ghost">
              <Icon as={RefreshIcon} />
            </Button>
          </Tooltip>
        </Flex>
      </Flex>
      <BaseTable
        columns={columns}
        data={data}
        sx={{
          height: '100%',
        }}
      />
    </Flex>
  );
};

export default Commands;
