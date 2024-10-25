import {
  Box,
  Divider,
  Flex,
  Icon,
  Menu,
  MenuDivider,
  MenuItem,
  MenuList,
  Scrollbar,
  Text,
  useColorStyle,
} from '@tonic-ui/react';
import { ensureArray, ensureString } from 'ensure-type';
import React, { forwardRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { routes, mapRoutePathToPageTitle } from '@app/config/routes';
import NavLink from './components/NavLink';

const MiniNav = forwardRef((
  {
    isExpanded,
    ...rest
  },
  ref,
) => {
  const [colorStyle] = useColorStyle();
  const navigate = useNavigate();
  const location = useLocation();
  const [hoveredItem, setHoveredItem] = useState(null);

  if (isExpanded) {
    return (
      <Box
        as="nav"
        ref={ref}
        sx={{
          backgroundColor: colorStyle?.background?.primary,
          color: colorStyle?.color?.primary,
          boxShadow: `1px 0 0 0 ${colorStyle.divider}`,
        }}
        {...rest}
      >
        <Box mb="2x" />
        <Scrollbar
          height="100%"
          overflowY="scroll"
        >
          {routes.map((route, index) => {
            const key = route.path;
            const isHidden = !!route.hidden;
            const isSelected = ensureString(location.pathname).startsWith(route.path);

            if (isHidden) {
              return null;
            }

            if (!route.routes) {
              return (
                <NavLink
                  key={key}
                  isSelected={isSelected}
                  onClick={() => {
                    navigate(route.path);
                  }}
                  height="10x"
                  position="relative"
                  px="6x"
                  py="3x"
                >
                  <Flex
                    alignItems="center"
                    columnGap="4x"
                  >
                    {(route.icon && typeof route.icon === 'string') && (
                      <Icon icon={route.icon} size="6x" />
                    )}
                    {(route.icon && typeof route.icon !== 'string') && (
                      <Icon as={route.icon} size="6x" />
                    )}
                    <Text>
                      {mapRoutePathToPageTitle(route.path)}
                    </Text>
                  </Flex>
                </NavLink>
              );
            }

            return (
              <Box key={key}>
                <Divider my="2x" />
                <Flex
                  px="6x"
                  py="2x"
                  alignItems="center"
                  columnGap="4x"
                  color={colorStyle.color.secondary}
                >
                  {(route.icon && typeof route.icon === 'string') && (
                    <Icon icon={route.icon} size="6x" />
                  )}
                  {(route.icon && typeof route.icon !== 'string') && (
                    <Icon as={route.icon} size="6x" />
                  )}
                  <Text>
                    {mapRoutePathToPageTitle(route.path)}
                  </Text>
                </Flex>
                {ensureArray(route.routes).map((childRoute, index) => {
                  const key = childRoute.path;
                  const isHidden = !!childRoute.hidden || !!childRoute.divider;
                  const isSelected = ensureString(location.pathname).startsWith(childRoute.path);

                  if (isHidden) {
                    return null;
                  }

                  return (
                    <NavLink
                      key={key}
                      isSelected={isSelected}
                      onClick={() => {
                        navigate(childRoute.path);
                      }}
                      height="10x"
                      position="relative"
                      px="6x"
                      py="3x"
                    >
                      <Flex
                        alignItems="center"
                        columnGap="4x"
                      >
                        <Flex
                          minWidth="6x"
                          justifyContent="center"
                        >
                          {(childRoute.icon && typeof childRoute.icon === 'string') && (
                            <Icon icon={childRoute.icon} size="4x" />
                          )}
                          {(childRoute.icon && typeof childRoute.icon !== 'string') && (
                            <Icon as={childRoute.icon} size="4x" />
                          )}
                        </Flex>
                        <Text>
                          {mapRoutePathToPageTitle(childRoute.path)}
                        </Text>
                      </Flex>
                    </NavLink>
                  );
                })}
              </Box>
            );
          })}
        </Scrollbar>
      </Box>
    );
  }

  return (
    <Box
      as="nav"
      ref={ref}
      sx={{
        backgroundColor: colorStyle?.background?.primary,
        color: colorStyle?.color?.primary,
        boxShadow: `1px 0 0 0 ${colorStyle.divider}`,
      }}
      {...rest}
    >
      {routes.map((route, index) => {
        const key = route.path;
        const isHidden = !!route.hidden;
        const isSelected = ensureString(location.pathname).startsWith(route.path);
        const childRoutes = ensureArray(route.routes);

        if (isHidden) {
          return null;
        }

        return (
          <NavLink
            key={key}
            isSelected={isSelected}
            onClick={() => {
              if (childRoutes.length > 0) {
                return;
              }

              navigate(route.path);
            }}
            height="18x"
            position="relative"
            alignItems="flex-start"
            justifyContent="center"
            py="4x"
            onPointerEnter={() => {
              setHoveredItem(route.path);
            }}
            onPointerLeave={() => {
              setHoveredItem(null);
            }}
          >
            <Flex
              direction="column"
              alignItems="center"
              rowGap="1x"
            >
              {(route.icon && typeof route.icon === 'string') && (
                <Icon icon={route.icon} size="6x" />
              )}
              {(route.icon && typeof route.icon !== 'string') && (
                <Icon as={route.icon} size="6x" />
              )}
              <Text
                fontSize={10}
                lineHeight={1}
                textAlign="center"
                wordBreak="break-word"
              >
                {mapRoutePathToPageTitle(route.path)}
              </Text>
            </Flex>
            {(childRoutes.length > 0) && (
              <Box
                boxShadow={colorStyle?.shadow?.thin}
                cursor="default"
                position="absolute"
                top={0}
                left="100%"
              >
                <Menu
                  isOpen={hoveredItem === route.path}
                >
                  <MenuList
                    width="max-content"
                  >
                    {childRoutes.map((childRoute, childIndex) => {
                      const childKey = childRoute.path;
                      const isHidden = !!childRoute.hidden;
                      const isDivider = !!childRoute.divider;

                      if (isHidden) {
                        return null;
                      }

                      if (isDivider) {
                        const childKey = `menu-divider-${childIndex}`;
                        return (
                          <MenuDivider key={childKey} />
                        );
                      }

                      return (
                        <MenuItem
                          key={childKey}
                          onClick={() => {
                            navigate(childRoute.path);
                          }}
                        >
                          <Text px="2x">
                            {mapRoutePathToPageTitle(childRoute.path)}
                          </Text>
                        </MenuItem>
                      );
                    })}
                  </MenuList>
                </Menu>
              </Box>
            )}
          </NavLink>
        );
      })}
    </Box>
  );
});

MiniNav.displayName = 'MiniNav';

export default MiniNav;
