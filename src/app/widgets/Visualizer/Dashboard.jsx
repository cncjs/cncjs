import {
  Box,
  Flex,
  Image,
  LinearProgress,
  LinkButton,
  Text,
} from '@tonic-ui/react';
import { ensurePositiveNumber } from 'ensure-type';
import escape from 'lodash/escape';
import throttle from 'lodash/throttle';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import VirtualList from 'react-tiny-virtual-list';
import api from '@app/api';
import i18n from '@app/lib/i18n';
import { formatBytes } from '@app/lib/numeral';
import styles from './dashboard.styl';

/**
 * @param {{ show?: boolean, state?: object }} props
 */
function Dashboard({ show = false, state = {} }) {
  const viewerRef = useRef(null);
  const [visibleHeight, setVisibleHeight] = useState(0);
  const content = state.gcode?.content || '';
  const total = state.gcode?.total || 0;
  const lines = useMemo(() => content
    .split('\n')
    .filter(line => line.trim().length > 0), [content]);

  const resizeVirtualList = useMemo(() => throttle(() => {
    const element = viewerRef.current;
    if (!element) {
      return;
    }

    const clientHeight = ensurePositiveNumber(element.clientHeight);
    if (clientHeight > 0) {
      setVisibleHeight(clientHeight);
    }
  }, 32), []);

  useEffect(() => {
    resizeVirtualList();
    window.addEventListener('resize', resizeVirtualList);
    return () => {
      window.removeEventListener('resize', resizeVirtualList);
      resizeVirtualList.cancel();
    };
  }, [resizeVirtualList]);

  useEffect(() => {
    if (show) {
      resizeVirtualList();
    }
  }, [resizeVirtualList, show, lines.length, total]);

  const renderItem = useCallback(({ index, style }) => (
    <Box key={index} style={style}>
      <Box className={styles.line}>
        <Box as="span" className={`${styles.label} ${styles.labelDefault}`}>
          {index + 1}
        </Box>
        {escape(lines[index])}
      </Box>
    </Box>
  ), [lines]);

  const gcode = state.gcode || {};
  const filename = gcode.name || 'noname.nc';
  const filesize = gcode.ready ? formatBytes(gcode.size, 0) : '';
  const sent = gcode.sent || 0;

  return (
    <Box
      aria-label={i18n._('G-code dashboard')}
      className={styles.dashboard}
      position="absolute"
      top={0}
      right="10px"
      bottom="10px"
      left="10px"
      display={show ? 'flex' : 'none'}
      flexDirection="column"
      backgroundColor="background.highest"
      border={1}
      borderColor="border.secondary"
    >
      <Box
        flex="none"
        px="2x"
        py="1x"
        borderBottom={1}
        borderColor="border.secondary"
        color="text.primary"
      >
        {i18n._('G-code')}
      </Box>
      <Box display="flex" flexDirection="column" flex="1" minHeight="0" padding="10px">
        <Flex flex="none" justifyContent="space-between" mb="2x">
          <Box as="span" whiteSpace="nowrap">
            {gcode.ready && (
              <LinkButton
                onClick={() => {
                  api.downloadGCode();
                }}
                variant="inline"
              >
                <Box as="strong">{filename}</Box>
              </LinkButton>
            )}
            {!gcode.ready && i18n._('G-code not loaded')}
          </Box>
          <Box as="span" whiteSpace="nowrap">
            {filesize}
          </Box>
        </Flex>
        <Box position="relative" flex="none" mb="10px">
          <LinearProgress
            aria-label={i18n._('G-code progress')}
            height="20px"
            borderRadius="4px"
            color="#5bc0de"
            min={0}
            max={Math.max(total, 1)}
            value={sent}
            variant="determinate"
          />
          {total > 0 && (
            <Text position="absolute" inset="0" fontSize="sm" lineHeight="20px" textAlign="center" color="text.primary">
              {sent}&nbsp;/&nbsp;{total}
            </Text>
          )}
        </Box>
        <Box
          ref={viewerRef}
          className={styles.gcodeViewer}
          position="relative"
          flex="1"
          minHeight="0"
          border={1}
          borderColor="border.secondary"
          backgroundColor={lines.length === 0 ? 'background.high' : 'background.highest'}
          overflow="hidden"
        >
          {lines.length > 0 && (
            <VirtualList
              width="100%"
              height={visibleHeight}
              style={{ padding: '0 5px' }}
              itemCount={lines.length}
              itemSize={20}
              renderItem={renderItem}
              scrollToIndex={sent}
            />
          )}
          {lines.length === 0 && (
            <Box className={styles.absoluteCenter}>
              <Image src="images/logo-square-256x256.png" alt="" />
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default Dashboard;
