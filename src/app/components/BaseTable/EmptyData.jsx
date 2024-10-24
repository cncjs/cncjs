import {
  Flex,
} from '@tonic-ui/react';

const EmptyData = (props) => {
  return (
    <Flex
      justifyContent="center"
      alignItems="center"
      width="100%"
      height="100%"
      {...props}
    />
  );
};

export default EmptyData;
