import {
  Box,
  ButtonBase,
  Flex,
  Icon,
  Image,
  Space,
  Text,
  useColorMode,
  useColorStyle,
} from '@tonic-ui/react';
import React, { forwardRef, useCallback } from 'react';
import IconButton from 'app/components/IconButton';
import settings from 'app/config/settings';
import i18next from 'app/i18next';
import iconLogo from 'app/images/logo-badge-32x32.png';

const Header = forwardRef((
  {
    onToggle,
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
      {...rest}
    >
      <Flex
        alignItems="center"
        height="100%"
        px="4x"
      >
        <IconButton
          width="10x"
          height="10x"
          onClick={onToggle}
        >
          <Icon icon="menu" size="6x"/>
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
          textTransform="uppercase"
          fontFamily="mono"
          fontSize="xs"
          lineHeight="1"
          whiteSpace="nowrap"
        >
          {i18next.language}
        </Text>
      </Flex>
    </Box>
  );
});

Header.displayName = 'Header';

export default Header;
