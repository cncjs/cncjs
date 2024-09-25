import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Box,
  ButtonBase,
  Divider,
  Flex,
  Icon,
  Image,
  Menu,
  MenuDivider,
  MenuGroup,
  MenuItem,
  MenuList,
  MenuToggle,
  Space,
  Text,
  useColorMode,
  useColorStyle,
} from '@tonic-ui/react';
import {
  ensureArray,
} from 'ensure-type';
import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import FocusLock from 'react-focus-lock';
import { useLocation, useNavigate } from 'react-router-dom';
import IconButton from '@app/components/IconButton';
import env from '@app/config/env';
import layout from '@app/config/layout';
import { mapRoutePathToPageTitle } from '@app/config/routes';
import settings from '@app/config/settings';
import i18next from '@app/i18next';
import iconLogo from '@app/images/logo-badge-32x32.png';
import controller from '@app/lib/controller';
import i18n from '@app/lib/i18n';
import log from '@app/lib/log';
import * as user from '@app/lib/user';
import config from '@app/store/config';
import Avatar from './components/Avatar';
import { ensureColorMode, getColorScheme, mapDisplayLanguageToLocaleString } from './utils';

const supportedLngs = ensureArray(JSON.parse(env.LANGUAGES));

const MenuStateContext = createContext();

const AppearanceMenuItems = forwardRef((props, ref) => {
  const [, navigateMenu] = useContext(MenuStateContext);
  const [colorMode, setColorMode] = useColorMode();
  const appearance = config.get('settings.appearance');
  const setAppearance = (value) => {
    // The value can be one of 'auto', 'dark', or 'light'
    const nextColorMode = (value === 'auto')
      ? getColorScheme(colorMode)
      : ensureColorMode(value);

    // Change current color mode
    setColorMode(nextColorMode);

    // Update appearance setting
    config.set('settings.appearance', value);
  };

  return (
    <Box
      ref={ref}
      {...props}
    >
      <Flex alignItems="center" px="3x">
        <Flex flex="none" mr="3x">
          <ButtonBase
            onClick={(event) => {
              // Prevent the menu from closing
              event.preventDefault();

              navigateMenu('main');
            }}
          >
            <Icon icon="arrow-left" />
          </ButtonBase>
        </Flex>
        <Flex flex="auto">
          <Text fontSize="md" lineHeight="md">
            {i18n._('Appearance')}
          </Text>
        </Flex>
      </Flex>
      <MenuDivider />
      <MenuGroup
        title={(
          <Text fontSize="xs" lineHeight="xs">
            {i18n._('Setting applies to this browser only')}
          </Text>
        )}
      >
        <MenuItem onClick={(event) => setAppearance('auto')}>
          <Flex flex="none" mr="3x" minWidth="4x">
            {appearance === 'auto' && <Icon icon="check" />}
          </Flex>
          <Flex flex="auto">
            {i18n._('Use device theme')}
          </Flex>
        </MenuItem>
        <MenuItem onClick={(event) => setAppearance('dark')}>
          <Flex flex="none" mr="3x" minWidth="4x">
            {appearance === 'dark' && <Icon icon="check" />}
          </Flex>
          <Flex flex="auto">
            {i18n._('Dark theme')}
          </Flex>
        </MenuItem>
        <MenuItem onClick={(event) => setAppearance('light')}>
          <Flex flex="none" mr="3x" minWidth="4x">
            {appearance === 'light' && <Icon icon="check" />}
          </Flex>
          <Flex flex="auto">
            {i18n._('Light theme')}
          </Flex>
        </MenuItem>
      </MenuGroup>
    </Box>
  );
});

const LanguageMenuItems = forwardRef((props, ref) => {
  const [, navigateMenu] = useContext(MenuStateContext);
  const currentLanguage = config.get('settings.language');
  const setLanguage = async (value) => {
    if (value === i18next.language) {
      return;
    }

    // Update language setting
    config.set('settings.language', value);

    // Persist language setting to cookies and local storage before reloading the page
    await config.persist();

    i18next.changeLanguage(value, (err, t) => {
      window.location.reload();
    });
  };

  return (
    <Box
      ref={ref}
      {...props}
    >
      <Flex alignItems="center" px="3x">
        <Flex flex="none" mr="3x">
          <ButtonBase
            onClick={(event) => {
              // Prevent the menu from closing
              event.preventDefault();

              navigateMenu('main');
            }}
          >
            <Icon icon="arrow-left" />
          </ButtonBase>
        </Flex>
        <Flex flex="auto">
          <Text fontSize="md" lineHeight="md">
            {i18n._('Choose your language')}
          </Text>
        </Flex>
      </Flex>
      <MenuDivider />
      {supportedLngs.map(language => (
        <MenuItem
          key={language}
          onClick={(event) => setLanguage(language)}
        >
          <Flex flex="none" mr="3x" minWidth="4x">
            {language === currentLanguage && <Icon icon="check" />}
          </Flex>
          <Flex flex="auto">
            {mapDisplayLanguageToLocaleString(language)}
          </Flex>
        </MenuItem>
      ))}
    </Box>
  );
});

const MainMenuItems = forwardRef((props, ref) => {
  const [, navigateMenu] = useContext(MenuStateContext);
  const [colorMode] = useColorMode();
  const [colorStyle] = useColorStyle({ colorMode });
  const location = useLocation();
  const navigate = useNavigate();
  const isUserAccountEnabled = config.get('session.enabled');
  const userAccountName = config.get('session.name');
  const appearance = config.get('settings.appearance') ?? 'auto';
  const language = config.get('settings.language') ?? i18next.language;
  const localeLanguage = mapDisplayLanguageToLocaleString(language);

  return (
    <Box
      ref={ref}
      {...props}
    >
      {isUserAccountEnabled && (
        <>
          <Flex alignItems="center" columnGap="3x" px="3x">
            <Avatar
              backgroundColor={colorStyle.background.tertiary}
              color={colorStyle.color.secondary}
              _hover={{
                color: colorStyle.color.primary,
              }}
            >
              <FontAwesomeIcon icon="user" style={{ width: 24, height: 24 }} />
            </Avatar>
            <Text>{i18n._('Signed in as {{name}}', { name: userAccountName })}</Text>
          </Flex>
          <MenuDivider />
        </>
      )}
      <MenuItem
        onClick={(event) => {
          // Prevent the menu from closing
          event.preventDefault();

          navigateMenu('appearance');
        }}
      >
        <Flex flex="none" mr="3x">
          <Icon icon="color" />
        </Flex>
        <Flex flex="auto">
          <Text>
            {{
              'auto': i18n._('Appearance: Device theme'),
              'dark': i18n._('Appearance: Dark'),
              'light': i18n._('Appearance: Light'),
            }[appearance]}
          </Text>
        </Flex>
        <Flex flex="none" ml="3x">
          <Icon icon="chevron-right" />
        </Flex>
      </MenuItem>
      <MenuItem
        onClick={(event) => {
          // Prevent the menu from closing
          event.preventDefault();

          navigateMenu('language');
        }}
      >
        <Flex flex="none" mr="3x">
          <Icon icon="language" />
        </Flex>
        <Flex flex="auto">
          <Text>
            {i18n._('Language: {{language}}', { language: localeLanguage })}
          </Text>
        </Flex>
        <Flex flex="none" ml="3x">
          <Icon icon="chevron-right" />
        </Flex>
      </MenuItem>
      <MenuDivider />
      <MenuItem
        onClick={(event) => {
          const url = '/about';
          navigate(url);
        }}
      >
        <Flex flex="none" mr="3x">
          <Icon icon="info-o" />
        </Flex>
        <Flex flex="auto">
          <Text>{i18n._('About')}</Text>
        </Flex>
      </MenuItem>
      <MenuItem
        onClick={(event) => {
          const url = settings.url.wiki;
          window.open(url, '_blank');
        }}
      >
        <Flex flex="none" mr="3x">
          <Icon icon="help-o" />
        </Flex>
        <Flex flex="auto">
          <Text>{i18n._('Help')}</Text>
        </Flex>
      </MenuItem>
      <MenuItem
        onClick={(event) => {
          const url = settings.url.issues;
          window.open(url, '_blank');
        }}
      >
        <Flex flex="none" mr="3x">
          <Icon icon="investigation" />
        </Flex>
        <Flex flex="auto">
          <Text>{i18n._('Report an issue')}</Text>
        </Flex>
      </MenuItem>
      {isUserAccountEnabled && (
        <>
          <MenuDivider />
          <MenuItem
            onClick={(event) => {
              if (user.isAuthenticated()) {
                log.debug('Destroy and cleanup the WebSocket connection');
                controller.disconnect();

                user.signout();

                // remember current location
                const url = location.pathname;
                navigate(url, { replace: true });
              }
            }}
          >
            <Flex flex="none" mr="3x">
              <Icon icon="box-out" />
            </Flex>
            <Flex flex="auto">
              <Text>{i18n._('Sign out')}</Text>
            </Flex>
          </MenuItem>
        </>
      )}
    </Box>
  );
});

const Header = forwardRef((
  {
    onToggle,
    ...rest
  },
  ref,
) => {
  const [colorMode] = useColorMode();
  const [colorStyle] = useColorStyle({ colorMode });
  const location = useLocation();
  const [menu, setMenu] = useState('main');
  const shouldPreventDefaultOnLossFocus = useRef(false);
  const navigateMenu = useCallback((nextMenu) => {
    setMenu(nextMenu);

    // The menu list will be blurred when the menu state changes because of losing focus.
    // We need to set a flag to prevent menu to be closed.
    shouldPreventDefaultOnLossFocus.current = true;
  }, []);
  const menuStateContext = useMemo(() => {
    return [menu, navigateMenu];
  }, [menu, navigateMenu]);

  return (
    <Flex
      as="header"
      ref={ref}
      backgroundColor={colorStyle?.background?.primary}
      color={colorStyle?.color?.primary}
      justifyContent="space-between"
      {...rest}
    >
      <Flex
        alignItems="center"
        px="4x"
      >
        <IconButton
          width="10x"
          height="10x"
          onClick={onToggle}
        >
          <Icon icon=":menu" size="6x"/>
        </IconButton>
        <Space minWidth="2x" />
        <ButtonBase
          onClick={(event) => {
            const url = settings.url.releases;
            window.open(url, '_blank');
          }}
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
        <Divider orientation="vertical" height="5x" mx="2x" />
        <Text>
          {mapRoutePathToPageTitle(location.pathname)}
        </Text>
      </Flex>
      <Flex
        alignItems="center"
        px="4x"
      >
        <Menu
          placement="bottom-end"
          onOpen={() => {
            setMenu('main');
          }}
        >
          <MenuToggle>
            <Avatar
              backgroundColor={colorStyle.background.tertiary}
              color={colorStyle.color.secondary}
              _hover={{
                color: colorStyle.color.primary,
              }}
            >
              <FontAwesomeIcon icon="user" style={{ width: 24, height: 24 }} />
            </Avatar>
          </MenuToggle>
          <FocusLock
            persistentFocus={true}
          >
            <MenuList
              onBlur={(event) => {
                if (shouldPreventDefaultOnLossFocus.current) {
                  event.preventDefault();

                  // Restore the flag to its initial state
                  shouldPreventDefaultOnLossFocus.current = false;
                }
              }}
              // Create a scrollable area for the menu list
              maxHeight={`calc(100vh - ${layout.header.height}px)`}
              overflowY="auto"
              // Use the intrinsic maximum width of the menu list
              width="max-content"
            >
              <MenuStateContext.Provider value={menuStateContext}>
                <AppearanceMenuItems
                  display={menu === 'appearance' ? 'block' : 'none'}
                />
                <LanguageMenuItems
                  display={menu === 'language' ? 'block' : 'none'}
                />
                <MainMenuItems
                  display={menu === 'main' ? 'block' : 'none'}
                />
              </MenuStateContext.Provider>
            </MenuList>
          </FocusLock>
        </Menu>
      </Flex>
    </Flex>
  );
});

Header.displayName = 'Header';

export default Header;
