import { Global, css } from '@emotion/react';
import {
  ButtonBase,
  Divider,
  Drawer,
  DrawerContent,
  DrawerOverlay,
  Flex,
  Icon,
  Image,
  Scrollbar,
  Space,
  Text,
  useColorMode,
  useColorStyle,
} from '@tonic-ui/react';
import { ensureArray, ensureString } from 'ensure-type';
import React, { forwardRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import IconButton from '@app/components/IconButton';
import layout from '@app/config/layout';
import { routes, mapRoutePathToPageTitle } from '@app/config/routes';
import settings from '@app/config/settings';
import i18next from '@app/i18next';
import iconLogo from '@app/images/logo-badge-32x32.png';
import NavLink from './components/NavLink';

const SideNav = forwardRef((
  {
    isOpen,
    onClose,
    ...rest
  },
  ref,
) => {
  const [colorMode] = useColorMode();
  const [colorStyle] = useColorStyle({ colorMode });
  const navigate = useNavigate();
  const location = useLocation();
  const handleViewReleases = useCallback(() => {
    const releases = 'https://github.com/cncjs/cncjs/releases';
    window.open(releases, '_blank');
  }, []);

  return (
    <Drawer
      ref={ref}
      backdrop={true}
      closeOnEsc={true}
      closeOnOutsideClick={true}
      isOpen={isOpen}
      onClose={onClose}
      placement="left"
    >
      <Global
        styles={css`
          body {
            overflow: hidden;
          }
        `}
      />
      <DrawerOverlay />
      <DrawerContent
        ref={ref}
        sx={{
          backgroundColor: colorStyle?.background?.primary,
          color: colorStyle?.color?.primary,
          border: 0,
          boxShadow: `1px 0 0 0 ${colorStyle.divider}`,
          width: layout.sidenav.width,
          whiteSpace: 'nowrap',
        }}
        {...rest}
      >
        <Flex
          flex="none"
          height="12x"
          alignItems="center"
          px="4x"
          mb="2x"
        >
          <IconButton
            width="10x"
            height="10x"
            onClick={onClose}
          >
            <Icon icon=":nav-menu" size="6x"/>
          </IconButton>
          <Space minWidth="2x" />
          <ButtonBase
            onClick={handleViewReleases}
            title={`${settings.productName} ${settings.version}`}
            color={colorStyle?.color?.primary}
            px="2x"
            position="relative"
          >
            <Flex
              alignItems="center"
              columnGap="1x"
            >
              <Image
                alt=""
                src={iconLogo}
                width="8x"
                height="8x"
              />
              <Text
                fontWeight="semibold"
                fontSize="lg"
                lineHeight="lg"
              >
                {settings.productName}
              </Text>
            </Flex>
          </ButtonBase>
          <Text
            color={colorStyle?.color?.tertiary}
            fontFamily="mono"
            fontSize="xs"
            lineHeight="1"
            textTransform="uppercase"
            whiteSpace="nowrap"
          >
            {i18next.language}
          </Text>
        </Flex>
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
              <>
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
              </>
            );
          })}
          <Divider my="2x" />
        </Scrollbar>
      </DrawerContent>
    </Drawer>
  );
});

SideNav.displayName = 'SideNav';

export default SideNav;
