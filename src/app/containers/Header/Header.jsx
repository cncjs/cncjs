import {
  Box,
  ButtonBase,
  Flex,
  Icon,
  Image,
  Text,
  useColorMode,
  useColorStyle,
} from '@tonic-ui/react';
import React, { forwardRef, useCallback } from 'react';
import IconButton from 'app/components/IconButton';
import settings from 'app/config/settings';
import i18next from 'app/i18next';
import iconLogo from 'app/images/logo-badge-32x32.png';

const headerHeight = '12x';

const Header = forwardRef((
  {
    toggleSideNav,
    ...rest
  },
  ref,
) => {
  const [colorMode] = useColorMode();
  const [colorStyle] = useColorStyle({ colorMode });
  const handleViewReleases = useCallback(() => {
    const releases = 'https://github.com/cncjs/cncjs/releases';
    window.open(releases, '_blank');
  }, []);

  return (
    <Box
      as="header"
      ref={ref}
      backdropFilter="blur(20px)"
      backgroundColor={colorStyle?.background?.primary}
      color={colorStyle?.color?.primary}
      position="fixed"
      top={0}
      left={0}
      right={0}
      height={headerHeight}
      zIndex="fixed"
      {...rest}
    >
      <Flex
        alignItems="center"
        columnGap="2x"
        height={headerHeight}
        px="4x"
      >
        <IconButton
          width="10x"
          height="10x"
          onClick={() => {
            toggleSideNav();
          }}
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
    </Box>
  );
});

Header.displayName = 'Header';

export default Header;
