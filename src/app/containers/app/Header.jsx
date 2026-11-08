import { useQueryClient } from '@tanstack/react-query';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Box,
  ButtonBase,
  Divider,
  Flex,
  Icon,
  Image,
  Dropdown,
  DropdownToggle,
  MenuDivider,
  MenuGroup,
  MenuItem,
  Space,
  Text,
  useColorMode,
} from '@tonic-ui/react';
import {
  ArrowLeftIcon,
  BoxOutIcon,
  CheckIcon,
  ChevronRightIcon,
  ColorIcon,
  HelpOIcon,
  InfoOIcon,
  InvestigationIcon,
  LanguageIcon,
  MenuIcon,
} from '@tonic-ui/react-icons';
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
import { useLocation, useNavigate } from 'react-router-dom';
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
import { signoutAndClearSession } from '@app/queries/session';
import config from '@app/store/config';
import Avatar from './components/Avatar';
import CommandsMenu from './components/CommandsMenu';
import QuickAccessToolbar from './components/QuickAccessToolbar';
import { ensureColorMode, getColorScheme, mapDisplayLanguageToLocaleString } from './utils';

const supportedLanguages = ensureArray(env.LANGUAGES)
  .map(language => {
    return {
      value: language,
      label: mapDisplayLanguageToLocaleString(language),
    };
  })
  .sort((a, b) => {
    const bottomHalfLanguages = new Set(['ja', 'zh-cn', 'zh-tw']);

    const priorityA = bottomHalfLanguages.has(a.value) ? 1 : 0;
    const priorityB = bottomHalfLanguages.has(b.value) ? 1 : 0;

    // If both items are in the priority list, keep their original order
    if (priorityA === priorityB) {
      return a.label.localeCompare(b.label);
    }

    // If only one item is in the priority list, prioritize the other
    return priorityA - priorityB;
  });

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
            aria-label="Back"
            onClick={(event) => {
              // Prevent the menu from closing
              event.preventDefault();

              navigateMenu('main');
            }}
          >
            <Icon as={ArrowLeftIcon} />
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
            {appearance === 'auto' && <Icon as={CheckIcon} />}
          </Flex>
          <Flex flex="auto">
            {i18n._('Use device theme')}
          </Flex>
        </MenuItem>
        <MenuItem onClick={(event) => setAppearance('dark')}>
          <Flex flex="none" mr="3x" minWidth="4x">
            {appearance === 'dark' && <Icon as={CheckIcon} />}
          </Flex>
          <Flex flex="auto">
            {i18n._('Dark theme')}
          </Flex>
        </MenuItem>
        <MenuItem onClick={(event) => setAppearance('light')}>
          <Flex flex="none" mr="3x" minWidth="4x">
            {appearance === 'light' && <Icon as={CheckIcon} />}
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
            aria-label="Back"
            onClick={(event) => {
              // Prevent the menu from closing
              event.preventDefault();

              navigateMenu('main');
            }}
          >
            <Icon as={ArrowLeftIcon} />
          </ButtonBase>
        </Flex>
        <Flex flex="auto">
          <Text fontSize="md" lineHeight="md">
            {i18n._('Choose your language')}
          </Text>
        </Flex>
      </Flex>
      <MenuDivider />
      {supportedLanguages.map(language => (
        <MenuItem
          key={language.value}
          onClick={(event) => setLanguage(language.value)}
        >
          <Flex flex="none" mr="3x" minWidth="4x">
            {language.value === currentLanguage && <Icon as={CheckIcon} />}
          </Flex>
          <Flex flex="auto">
            {language.label}
          </Flex>
        </MenuItem>
      ))}
    </Box>
  );
});

const MainMenuItems = forwardRef((props, ref) => {
  const [, navigateMenu] = useContext(MenuStateContext);
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
              backgroundColor="background.medium"
              color="text.secondary"
              _hover={{
                color: 'text.primary',
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
          <Icon as={ColorIcon} />
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
          <Icon as={ChevronRightIcon} />
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
          <Icon as={LanguageIcon} />
        </Flex>
        <Flex flex="auto">
          <Text>
            {i18n._('Language: {{language}}', { language: localeLanguage })}
          </Text>
        </Flex>
        <Flex flex="none" ml="3x">
          <Icon as={ChevronRightIcon} />
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
          <Icon as={InfoOIcon} />
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
          <Icon as={HelpOIcon} />
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
          <Icon as={InvestigationIcon} />
        </Flex>
        <Flex flex="auto">
          <Text>{i18n._('Report an issue')}</Text>
        </Flex>
      </MenuItem>
      {isUserAccountEnabled && (
        <>
          <MenuDivider />
          <MenuItem
            onClick={async (event) => {
              if (user.isAuthenticated()) {
                log.debug('Destroy and cleanup the WebSocket connection');
                controller.disconnect();

                await signoutAndClearSession(queryClient);

                // remember current location
                const url = location.pathname;
                navigate(url, { replace: true });
              }
            }}
          >
            <Flex flex="none" mr="3x">
              <Icon as={BoxOutIcon} />
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
      aria-label="Application header"
      backgroundColor="background.high"
      color="text.primary"
      justifyContent="space-between"
      {...rest}
    >
      <Flex
        alignItems="center"
        px="4x"
        flex="none"
        sx={{ '@media (max-width: 799px)': { px: '1x', '& [data-header-detail]': { display: 'none' } } }}
      >
        <ButtonBase
          aria-label={i18n._('Toggle navigation')}
          border={1}
          borderColor="transparent"
          color="text.secondary"
          lineHeight={1}
          px="2x"
          py="2x"
          transition="all .2s"
          width="10x"
          height="10x"
          onClick={onToggle}
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
          aria-label={`${settings.productName} ${settings.version} - View release notes`}
          onClick={(event) => {
            const url = settings.url.releases;
            window.open(url, '_blank');
          }}
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
              data-header-detail
              fontWeight="semibold"
              fontSize="lg"
              lineHeight="lg"
            >
              {settings.productName}
            </Text>
          </Flex>
        </ButtonBase>
        <Text
          data-header-detail
          color="text.tertiary"
          fontFamily="mono"
          fontSize="xs"
          lineHeight="1"
          textTransform="uppercase"
          whiteSpace="nowrap"
        >
          {i18next.language}
        </Text>
        <Divider data-header-detail orientation="vertical" height="5x" mx="2x" />
        <Text data-header-detail>
          {mapRoutePathToPageTitle(location.pathname)}
        </Text>
      </Flex>
      {location.pathname === '/workspace' && <QuickAccessToolbar />}
      <Flex
        alignItems="center"
        px="4x"
        flex="none"
        gap="2x"
      >
        <CommandsMenu />
        <Dropdown
          placement="bottom-end"
          onOpen={() => {
            setMenu('main');
          }}
          items={[
            {
              value: 'appearance',
              type: 'custom',
              content: (
                <AppearanceMenuItems
                  display={menu === 'appearance' ? 'block' : 'none'}
                />
              ),
            },
            {
              value: 'language',
              type: 'custom',
              content: (
                <LanguageMenuItems
                  display={menu === 'language' ? 'block' : 'none'}
                />
              ),
            },
            {
              value: 'main',
              type: 'custom',
              content: (
                <MainMenuItems
                  display={menu === 'main' ? 'block' : 'none'}
                />
              ),
            },
          ]}
          renderItem={item => item?.content}
          slotProps={{
            content: {
              onBlur: (event) => {
                if (shouldPreventDefaultOnLossFocus.current) {
                  event.preventDefault();

                  // Restore the flag to its initial state
                  shouldPreventDefaultOnLossFocus.current = false;
                }
              },
              // Create a scrollable area for the menu list
              maxHeight: `calc(100vh - ${layout.header.height}px)`,
              overflowY: 'auto',
              // Use the intrinsic maximum width of the menu list
              width: 'max-content',
            },
          }}
          renderToggle={() => (
            <DropdownToggle aria-label="Application menu">
              <Avatar
                backgroundColor="background.medium"
                color="text.secondary"
                _hover={{
                  color: 'text.primary',
                }}
              >
                <FontAwesomeIcon icon="user" style={{ width: 24, height: 24 }} />
              </Avatar>
            </DropdownToggle>
          )}
          renderContent={({ items, renderItems }) => (
            <MenuStateContext.Provider value={menuStateContext}>
              {renderItems(items)}
            </MenuStateContext.Provider>
          )}
        />
      </Flex>
    </Flex>
  );
});

Header.displayName = 'Header';

export default Header;
