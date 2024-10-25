import {
  Button,
  ButtonGroup,
  Divider,
  Flex,
  Input,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Space,
  Text,
  useColorStyle,
} from '@tonic-ui/react';
import {
  AngleLeftIcon,
  CollapseLeftIcon,
  AngleRightIcon,
  CollapseRightIcon,
} from '@tonic-ui/react-icons';
import { ensureArray, ensureNumber } from 'ensure-type';
import React, { forwardRef, useCallback, useEffect, useState } from 'react';
import i18n from '@app/lib/i18n';
import {
  DEFAULT_ROWS_PER_PAGE_OPTIONS,
} from './constants';

const defaultLabelRowsPerPage = ({ rowsPerPage }) => {
  return i18n._('{{rowsPerPage}} per page', { rowsPerPage });
};

const defaultLabelTotalCount = ({ count }) => {
  return i18n._('Total: {{count}}', { count });
};

const TablePagination = forwardRef((
  {
    count,
    disabled: disabledProp,
    defaultPage = 1,
    defaultRowsPerPage: defaultRowsPerPageProp,
    labelRowsPerPage = defaultLabelRowsPerPage,
    labelTotalCount = defaultLabelTotalCount,
    onPageChange: onPageChangeProp,
    onRowsPerPageChange: onRowsPerPageChangeProp,
    page: pageProp,
    rowsPerPage: rowsPerPageProp,
    rowsPerPageOptions = DEFAULT_ROWS_PER_PAGE_OPTIONS,
    showFirstButton = false,
    showLastButton = false,
  },
  ref,
) => {
  const [colorStyle] = useColorStyle();
  const defaultRowsPerPage = defaultRowsPerPageProp ?? ensureArray(rowsPerPageOptions)[0];
  const [page, setPage] = useState(pageProp ?? defaultPage);
  const [rowsPerPage, setRowsPerPage] = useState(rowsPerPageProp ?? defaultRowsPerPage);

  useEffect(() => {
    const isControlled = (pageProp !== undefined);
    if (isControlled) {
      setPage(pageProp);
    }
  }, [pageProp]);

  useEffect(() => {
    const isControlled = (rowsPerPageProp !== undefined);
    if (isControlled) {
      setRowsPerPage(rowsPerPageProp);
    }
  }, [rowsPerPageProp]);

  const onPageChange = useCallback((nextPage) => {
    const isControlled = (pageProp !== undefined);
    if (!isControlled) {
      setPage(nextPage);
    }

    if (typeof onPageChangeProp === 'function') {
      onPageChangeProp(nextPage);
    }
  }, [pageProp, onPageChangeProp]);

  const onRowsPerPageChange = useCallback((nextRowsPerPage) => {
    const isControlled = (rowsPerPageProp !== undefined);
    if (!isControlled) {
      setRowsPerPage(nextRowsPerPage);
    }

    if (typeof onRowsPerPageChangeProp === 'function') {
      onRowsPerPageChangeProp(nextRowsPerPage);
    }
  }, [rowsPerPageProp, onRowsPerPageChangeProp]);

  const totalPages = Math.ceil(count / rowsPerPage);
  const handlePageChange = (event) => {
    const nextPage = ensureNumber(event.target.value);
    if (nextPage <= 1) {
      onPageChange(1);
    } else if (nextPage >= totalPages) {
      onPageChange(totalPages);
    } else {
      onPageChange(nextPage);
    }
  };
  const handleRowsPerPageChange = (event) => {
    const nextRowsPerPage = ensureNumber(event.target.value);
    if (nextRowsPerPage > 0) {
      onPageChange(1);
      onRowsPerPageChange(nextRowsPerPage);
    }
  };
  const canPreviousPage = (page > 1);
  const canNextPage = (page < totalPages);

  return (
    <Flex
      alignItems="center"
      justifyContent="flex-end"
      backgroundColor={colorStyle.background.secondary}
      color={disabledProp ? colorStyle.color.disabled : undefined}
      px="6x"
      py="3x"
    >
      <Text mr="2x">
        {labelTotalCount({ count })}
      </Text>
      <Divider
        orientation="vertical"
        height="6x"
      />
      <Menu
        placement="top"
      >
        <MenuButton
          disabled={disabledProp}
          variant="ghost"
        >
          {labelRowsPerPage({ rowsPerPage })}
        </MenuButton>
        <MenuList
          onClick={handleRowsPerPageChange}
          width="100%"
        >
          {rowsPerPageOptions.map((option) => (
            <MenuItem
              key={option}
              value={option}
            >
              {option}
            </MenuItem>
          ))}
        </MenuList>
      </Menu>
      <Divider
        orientation="vertical"
        height="6x"
      />
      <Space width="2x" />
      <Input
        disabled={disabledProp}
        width="10x"
        px={0}
        textAlign="center"
        onChange={handlePageChange}
        value={page}
      />
      <Space width="2x" />
      <Text>/</Text>
      <Space width="2x" />
      <Text>{totalPages}</Text>
      <Space width="2x" />
      <ButtonGroup
        disabled={disabledProp}
        variant="secondary"
        sx={{
          '> *:not(:first-of-type)': {
            marginLeft: -1
          }
        }}
      >
        {showFirstButton && (
          <Button
            width="8x"
            disabled={!canPreviousPage}
            onClick={(event) => {
              onPageChange(1);
            }}
          >
            <CollapseLeftIcon />
          </Button>
        )}
        <Button
          width="8x"
          disabled={!canPreviousPage}
          onClick={(event) => {
            onPageChange(page - 1);
          }}
        >
          <AngleLeftIcon />
        </Button>
        <Button
          width="8x"
          disabled={!canNextPage}
          onClick={(event) => {
            onPageChange(page + 1);
          }}
        >
          <AngleRightIcon />
        </Button>
        {showLastButton && (
          <Button
            width="8x"
            disabled={!canNextPage}
            onClick={(event) => {
              onPageChange(totalPages);
            }}
          >
            <CollapseRightIcon />
          </Button>
        )}
      </ButtonGroup>
    </Flex>
  );
});

TablePagination.displayName = 'TablePagination';

export default TablePagination;
