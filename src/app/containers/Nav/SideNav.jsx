import { Global, css } from '@emotion/react';
import {
  Box,
  ButtonBase,
  Divider,
  Drawer,
  DrawerContent,
  DrawerOverlay,
  Flex,
  Icon,
  Image,
  Scrollbar,
  Text,
  useColorMode,
  useColorStyle,
} from '@tonic-ui/react';
import { ensureArray, ensureString } from 'ensure-type';
import React, { forwardRef, useCallback } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import IconButton from 'app/components/IconButton';
import routes from 'app/config/routes';
import settings from 'app/config/settings';
import i18next from 'app/i18next';
import iconLogo from 'app/images/logo-badge-32x32.png';
import i18n from 'app/lib/i18n';
import NavLink from './NavLink';

const headerHeight = '12x';
const sidenavWidth = '240px';

const SideNav = forwardRef((
  {
    isSideNavOpen,
    toggleSideNav,
    ...rest
  },
  ref,
) => {
  const [colorMode] = useColorMode();
  const [colorStyle] = useColorStyle({ colorMode });
  const history = useHistory();
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
      isOpen={isSideNavOpen}
      onClose={toggleSideNav}
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
        backgroundColor={colorStyle?.background?.primary}
        color={colorStyle?.color?.primary}
        borderY="none"
        borderLeft="none"
        width={sidenavWidth}
        whiteSpace="nowrap"
        {...rest}
      >
        <Flex
          alignItems="center"
          height={headerHeight}
          px="4x"
          mb="2x"
          columnGap="2x"
        >
          <IconButton
            width="10x"
            height="10x"
            onClick={() => toggleSideNav()}
          >
            <Icon icon="menu" size="6x"/>
          </IconButton>
          <ButtonBase
            onClick={handleViewReleases}
            title={`${settings.productName} ${settings.version}`}
            color={colorStyle?.color?.primary}
            height="100%"
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
            <Text
              position="absolute"
              top="1h"
              left="100%"
              ml="-2x"
              color={colorStyle?.color?.tertiary}
              textTransform="uppercase"
              fontFamily="mono"
              fontSize="xs"
              lineHeight="xs"
              whiteSpace="nowrap"
            >
              {i18next.language}
            </Text>
          </ButtonBase>
        </Flex>
        <Scrollbar
          height="100%"
          overflowY="scroll"
        >
          {routes.map((route, index) => {
            const key = route.path;
            const isSelected = ensureString(location.pathname).startsWith(route.path);

            if (!route.routes) {
              return (
                <NavLink
                  key={key}
                  isSelected={isSelected}
                  onClick={() => {
                    history.push(route.path);
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
                    <Icon
                      icon={route.icon}
                      size="6x"
                    />
                    <Text>
                      {i18n._(route.title)}
                    </Text>
                  </Flex>
                </NavLink>
              );
            }

            return (
              <>
                <Divider my="2x" />
                <Box
                  pt="1x"
                  pb="2x"
                  px="6x"
                >
                  <Text
                    color={colorStyle?.color?.secondary}
                    fontWeight="semibold"
                    textTransform="uppercase"
                  >
                    {i18n._(route.title)}
                  </Text>
                </Box>
                {ensureArray(route.routes).map((childRoute, index) => {
                  const key = childRoute.path;
                  const isSelected = ensureString(location.pathname).startsWith(childRoute.path);

                  return (
                    <NavLink
                      key={key}
                      isSelected={isSelected}
                      onClick={() => {
                        history.push(childRoute.path);
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
                        <Icon
                          icon={childRoute.icon}
                          size="6x"
                        />
                        <Text>
                          {i18n._(childRoute.title)}
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
