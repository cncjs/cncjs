import { Box, Spinner, Text } from '@tonic-ui/react';
import React from 'react';
import i18n from '@app/lib/i18n';

export default function Loading() {
  return (
    <Box
      position="absolute" top={100} left="50%"
      transform="translateX(-50%)" textAlign="center" role="status"
    >
      <Spinner size="md" mx="auto" aria-hidden="true" />
      <Text mt={15} mb={10}>{i18n._('Loading...')}</Text>
    </Box>
  );
}
