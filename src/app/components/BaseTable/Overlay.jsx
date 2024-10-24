import {
  Flex,
  useColorMode,
} from '@tonic-ui/react';

const Overlay = (props) => {
  const [colorMode] = useColorMode();
  const backgroundColor = {
    dark: 'rgba(0, 0, 0, .7)',
    light: 'rgba(0, 0, 0, .7)',
  }[colorMode];

  return (
    <Flex
      position="absolute"
      inset={0}
      alignItems="center"
      justifyContent="center"
      backgroundColor={backgroundColor}
      zIndex={1}
      {...props}
    />
  );
};

export default Overlay;
