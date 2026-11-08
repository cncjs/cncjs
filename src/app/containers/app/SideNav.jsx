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
} from '@tonic-ui/react';
import { MenuIcon } from '@tonic-ui/react-icons';
import { ensureArray, ensureString } from 'ensure-type';
import React, { forwardRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
      closeOnInteractOutside={true}
      isOpen={isOpen}
      onClose={onClose}
      placement="left"
    >
      {isOpen && (
        <Global
          styles={css`
            body {
              overflow: hidden;
            }
          `}
        />
      )}
      <DrawerOverlay />
      <DrawerContent
        ref={ref}
        aria-label="Main navigation"
        sx={{
          backgroundColor: 'background.high',
          color: 'text.primary',
          border: 0,
          borderRight: '1px solid',
          borderColor: 'border.secondary',
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
          <ButtonBase
            aria-label="Close navigation"
            border={1}
            borderColor="transparent"
            color="text.secondary"
            lineHeight={1}
            px="2x"
            py="2x"
            transition="all .2s"
            width="10x"
            height="10x"
            onClick={onClose}
            sx={{
              '&:focus': { color: 'text.secondary' },
              '&:hover': { color: 'text.accent' },
              '&:focus:hover': { color: 'text.accent' },
              '&:active': { color: 'text.secondary' },
              '&:focus:active': { color: 'text.secondary' },
            }}
          >
            <Icon as={MenuIcon} size="6x" />
          </ButtonBase>
          <Space minWidth="2x" />
          <ButtonBase
            onClick={handleViewReleases}
            title={`${settings.productName} ${settings.version}`}
            color="text.primary"
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
            color="text.tertiary"
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
                    {route.icon && (
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
                  color="text.secondary"
                >
                  {route.icon && (
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
                          {childRoute.icon && (
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
