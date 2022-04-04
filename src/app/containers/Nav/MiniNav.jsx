import {
  Box,
  Flex,
  Icon,
  Menu,
  MenuDivider,
  MenuGroup,
  MenuItem,
  MenuList,
  Text,
  useColorMode,
  useColorStyle,
} from '@tonic-ui/react';
import { ensureArray, ensureString } from 'ensure-type';
import React, { forwardRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import routes from 'app/config/routes';
import i18n from 'app/lib/i18n';
import NavLink from './NavLink';

const headerHeight = '12x';
const mininavWidth = '18x';

const MiniNav = forwardRef((props, ref) => {
  const [colorMode] = useColorMode();
  const [colorStyle] = useColorStyle({ colorMode });
  const history = useHistory();
  const location = useLocation();
  const [hoveredItem, setHoveredItem] = useState(null);

  return (
    <Box
      as="nav"
      ref={ref}
      backgroundColor={colorStyle?.background?.primary}
      color={colorStyle?.color?.primary}
      position="fixed"
      top={headerHeight}
      bottom={0}
      left={0}
      width={mininavWidth}
      zIndex="fixed"
      {...props}
    >
      {routes.map((route, index) => {
        const key = route.path;
        const isSelected = ensureString(location.pathname).startsWith(route.path);
        const childRoutes = ensureArray(route.routes);

        return (
          <NavLink
            key={key}
            isSelected={isSelected}
            onClick={() => {
              if (childRoutes.length > 0) {
                return;
              }

              history.push(route.path);
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
              <Icon
                icon={route.icon}
                size="6x"
              />
              <Text
                fontSize={10}
                lineHeight={1}
                textAlign="center"
              >
                {i18n._(route.title)}
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
                    <MenuGroup
                      title={(
                        <Text
                          fontWeight="semibold"
                          textTransform="uppercase"
                        >
                          {i18n._(route.title)}
                        </Text>
                      )}
                    >
                      <MenuDivider />
                      {childRoutes.map((childRoute) => {
                        const childKey = childRoute.path;

                        return (
                          <MenuItem
                            key={childKey}
                            onClick={() => {
                              history.push(childRoute.path);
                            }}
                          >
                            {i18n._(childRoute.title)}
                          </MenuItem>
                        );
                      })}
                    </MenuGroup>
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
