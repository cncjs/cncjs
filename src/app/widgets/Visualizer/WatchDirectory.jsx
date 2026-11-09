import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Flex,
  LinearProgress,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Space,
  Tree,
  TreeItem,
  TreeItemContent,
  TreeItemToggle,
  TreeItemToggleIcon,
} from '@tonic-ui/react';
import { AddIcon, FileOIcon, FolderOIcon, RefreshIcon, UploadIcon } from '@tonic-ui/react-icons';
import { format } from 'date-fns';
import { ensureArray } from 'ensure-type';
import path from 'path';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formatBytes } from '@app/lib/numeral';
import controller from '@app/lib/controller';
import i18n from '@app/lib/i18n';
import log from '@app/lib/log';
import {
  mapWatchDirectoryNodes,
  WATCH_DIRECTORY_QUERY_KEY,
  watchDirectoryQueryOptions,
  useUploadWatchDirectoryFileMutation,
} from './queries';
import watchDirectoryStyles from './watch-directory.styl';

/**
 * @param {object} value
 * @returns {string}
 */
const formatDateModified = value => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : format(date, 'PPpp');
};

/**
 * @param {object} node
 * @returns {string}
 */
const getNodeType = node => {
  const type = node.props?.type;
  if (type === 'd') {
    return i18n._('File folder');
  }
  if (type === 'f') {
    const extension = path.extname(node.name || '').slice(1);
    return extension
      ? i18n._('{{extname}} File', { extname: extension.toUpperCase() })
      : i18n._('File');
  }
  return '';
};

/**
 * @param {{
 *   directoryPath: string,
 *   expanded: boolean,
 *   expandedPaths: Array<string>,
 *   onLoadFile: Function,
 *   rememberNodes: Function,
 *   queryClient: object,
 * }} props
 */
function DirectoryChildren({
  directoryPath,
  expanded,
  expandedPaths,
  onLoadFile,
  rememberNodes,
  queryClient,
}) {
  const query = useQuery({
    ...watchDirectoryQueryOptions(directoryPath),
    enabled: expanded,
  });
  const nodes = useMemo(() => mapWatchDirectoryNodes(query.data), [query.data]);

  useEffect(() => {
    if (expanded) {
      rememberNodes(nodes);
    }
  }, [expanded, nodes, rememberNodes]);

  if (!expanded) {
    return null;
  }
  if (query.isLoading) {
    return (
      <Box role="status" px="3x" py="2x">
        <Spinner size="sm" />
        <Space width="2x" />
        {i18n._('Loading...')}
      </Box>
    );
  }
  if (query.isError) {
    return (
      <Flex
        alignItems="center"
        gap="2x"
        px="3x"
        py="2x"
        role="alert"
      >
        <Box>{i18n._('Unable to load directory')}</Box>
        <Button size="sm" onClick={() => query.refetch()}>
          {i18n._('Retry')}
        </Button>
      </Flex>
    );
  }
  if (nodes.length === 0) {
    return (
      <Box px="3x" py="2x" color="text.secondary">
        {i18n._('Empty directory')}
      </Box>
    );
  }

  return (
    <Box role="group">
      {nodes.map(node => (
        <WatchDirectoryNode
          key={node.id}
          node={node}
          expandedPaths={expandedPaths}
          onLoadFile={onLoadFile}
          rememberNodes={rememberNodes}
          queryClient={queryClient}
        />
      ))}
    </Box>
  );
}

/**
 * @param {{
 *   expandedPaths: Array<string>,
 *   node: object,
 *   onLoadFile: Function,
 *   rememberNodes: Function,
 *   queryClient: object,
 * }} props
 */
function WatchDirectoryNode({
  expandedPaths,
  node,
  onLoadFile,
  rememberNodes,
  queryClient,
}) {
  const isDirectory = node.props?.type === 'd';
  const dateModified = formatDateModified(node.props?.mtime);
  const size = ['f', 'l'].includes(node.props?.type) ? formatBytes(node.props?.size, 0) : '';

  const prefetch = useCallback(() => {
    if (!isDirectory) {
      return;
    }
    queryClient.prefetchQuery(watchDirectoryQueryOptions(node.id)).catch(() => {});
  }, [isDirectory, node.id, queryClient]);

  return (
    <TreeItem
      nodeId={node.id}
      disabled={Boolean(node.props?.disabled)}
      render={() => (
        <TreeItemContent
          data-node-id={node.id}
          onDoubleClick={(event) => {
            event.stopPropagation();
            if (!isDirectory) {
              onLoadFile(node);
            }
          }}
        >
          {isDirectory ? (
            <TreeItemToggle onClick={prefetch}>
              <TreeItemToggleIcon />
            </TreeItemToggle>
          ) : (
            <Box width="4x" />
          )}
          <Box
            as="span"
            flex="1"
            minWidth={0}
            sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {isDirectory ? <FolderOIcon aria-hidden="true" size="1em" /> : <FileOIcon aria-hidden="true" size="1em" />}
            <Space width="2x" />
            {node.name}
          </Box>
          <Box
            as="span"
            width="24%"
            whiteSpace="nowrap"
          >
            {dateModified}
          </Box>
          <Box
            as="span"
            width="14%"
            whiteSpace="nowrap"
          >
            {getNodeType(node)}
          </Box>
          <Box
            as="span"
            width="10%"
            textAlign="right"
            whiteSpace="nowrap"
          >
            {size}
          </Box>
        </TreeItemContent>
      )}
    >
      {isDirectory && (
        <DirectoryChildren
          directoryPath={node.id}
          expanded={expandedPaths.includes(node.id)}
          expandedPaths={expandedPaths}
          onLoadFile={onLoadFile}
          rememberNodes={rememberNodes}
          queryClient={queryClient}
        />
      )}
    </TreeItem>
  );
}

/**
 * @param {{ state?: object, actions?: object }} props
 */
function WatchDirectory({ state = {}, actions = {} }) {
  const queryClient = useQueryClient();
  const uploadMutation = useUploadWatchDirectoryFileMutation();
  const uploadInputRef = useRef(null);
  const dropzoneRef = useRef(null);
  const watchDirChangeTimer = useRef(null);
  const mountedRef = useRef(true);
  const [expanded, setExpanded] = useState([]);
  const [selected, setSelected] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const nodesByIdRef = useRef(new Map());
  const rootQuery = useQuery(watchDirectoryQueryOptions(''));
  const rootNodes = useMemo(() => mapWatchDirectoryNodes(rootQuery.data), [rootQuery.data]);
  const updateModalParams = actions.updateModalParams;

  const rememberNodes = useCallback((nodes) => {
    nodes.forEach(node => nodesByIdRef.current.set(node.id, node));
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (watchDirChangeTimer.current) {
        clearTimeout(watchDirChangeTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    rememberNodes(rootNodes);
    if (rootQuery.isSuccess) {
      setExpanded([]);
      setSelected([]);
      setSelectedNode(null);
      if (typeof updateModalParams === 'function') {
        updateModalParams({ selectedNode: null });
      }
    }
  }, [rememberNodes, rootNodes, rootQuery.isSuccess, updateModalParams]);

  useEffect(() => {
    const handleWatchDirChange = () => {
      if (watchDirChangeTimer.current) {
        clearTimeout(watchDirChangeTimer.current);
      }
      watchDirChangeTimer.current = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: [WATCH_DIRECTORY_QUERY_KEY] });
      }, 200);
    };

    controller.addListener('watchdir:change', handleWatchDirChange);
    return () => {
      controller.removeListener('watchdir:change', handleWatchDirChange);
      if (watchDirChangeTimer.current) {
        clearTimeout(watchDirChangeTimer.current);
      }
    };
  }, [queryClient]);

  const prefetchDirectory = useCallback((directoryPath) => {
    const node = nodesByIdRef.current.get(directoryPath);
    if (!node || node.props?.type !== 'd') {
      return;
    }
    queryClient.prefetchQuery(watchDirectoryQueryOptions(directoryPath)).catch(() => {});
  }, [queryClient]);

  const handleNodeFocus = useCallback((nodeId) => {
    prefetchDirectory(nodeId);
  }, [prefetchDirectory]);

  const handleNodeToggle = useCallback((nextExpanded) => {
    const next = ensureArray(nextExpanded);
    setExpanded(next);
    next
      .filter(nodeId => !expanded.includes(nodeId))
      .forEach(prefetchDirectory);
  }, [expanded, prefetchDirectory]);

  const handleNodeSelect = useCallback((nextSelected) => {
    const next = ensureArray(nextSelected);
    const nodeId = next[next.length - 1];
    const node = nodeId ? nodesByIdRef.current.get(nodeId) || null : null;
    setSelected(next);
    setSelectedNode(node);
    if (typeof actions.updateModalParams === 'function') {
      actions.updateModalParams({ selectedNode: node });
    }
  }, [actions]);

  const loadFile = useCallback((node) => {
    if (!node || node.props?.type !== 'f') {
      return;
    }
    if (typeof actions.loadFile === 'function') {
      actions.loadFile(node.id);
    }
    if (typeof actions.closeModal === 'function') {
      actions.closeModal();
    }
  }, [actions]);

  const handleTreeKeyDown = useCallback((event) => {
    if (event.key !== 'Enter') {
      return;
    }
    const nodeId = selected[selected.length - 1];
    const node = nodeId ? nodesByIdRef.current.get(nodeId) : null;
    if (node?.props?.type === 'f') {
      event.preventDefault();
      loadFile(node);
    }
  }, [loadFile, selected]);

  const uploadFiles = useCallback((files) => {
    if (files.length === 0 || uploading) {
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    const readers = files.map(file => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve({ file, data: reader.result });
      reader.onerror = reject;
      reader.readAsText(file);
    }));

    Promise.all(readers)
      .then((results) => {
        const progressOf = new Map(results.map(({ file }) => [file, 0]));
        const totalBytes = results.reduce((sum, { file }) => sum + file.size, 0);
        const updateProgress = () => {
          const uploaded = [...progressOf.values()].reduce((sum, value) => sum + value, 0);
          const percent = totalBytes > 0 ? (uploaded / totalBytes) * 100 : 100;
          if (mountedRef.current) {
            setUploadProgress(Math.min(100, Math.round(percent)));
          }
        };
        const onProgress = file => (event) => {
          const { direction, loaded = 0 } = { ...event };
          if (direction !== 'upload') {
            return;
          }
          progressOf.set(file, Math.min(loaded, file.size));
          updateProgress();
        };

        return Promise.all(results.map(({ file, data }) => uploadMutation.mutateAsync({
          file: file.name,
          data,
          onProgress: onProgress(file),
        })));
      })
      .catch((error) => {
        log.error('Failed to upload files to the watch directory:', error);
      })
      .then(() => {
        if (mountedRef.current) {
          setUploading(false);
          setUploadProgress(0);
          queryClient.invalidateQueries({ queryKey: [WATCH_DIRECTORY_QUERY_KEY] });
        }
      });
  }, [queryClient, uploadMutation, uploading]);

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    setDragging(false);
    uploadFiles(Array.from(event.dataTransfer?.files || []));
  }, [uploadFiles]);

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((event) => {
    event.preventDefault();
    if (!dropzoneRef.current || !dropzoneRef.current.contains(event.relatedTarget)) {
      setDragging(false);
    }
  }, []);

  const selectedFile = selectedNode?.props?.type === 'f';
  const { modal = {} } = state;
  const { params = {} } = modal;
  const canUpload = selectedFile;

  return (
    <Modal
      closeOnInteractOutside={false}
      isClosable
      isOpen
      size="md"
      onClose={actions.closeModal}
    >
      <ModalOverlay />
      <ModalContent sx={{ width: '80vw' }}>
        <ModalHeader>{i18n._('Watch Directory')}</ModalHeader>
        <ModalBody>
          <Flex alignItems="center" className={watchDirectoryStyles.toolbar}>
            <Box
              ref={uploadInputRef}
              as="input"
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={event => uploadFiles(Array.from(event.target.files || []))}
            />
            <Button
              aria-label={i18n._('Add')}
              disabled={uploading}
              onClick={() => {
                if (uploadInputRef.current) {
                  uploadInputRef.current.value = null;
                  uploadInputRef.current.click();
                }
              }}
            >
              <AddIcon aria-hidden="true" size="1em" />
              <Space width="1x" />
              {i18n._('Add')}
            </Button>
            {uploading && <Spinner size="sm" ml="2x" />}
            <Button
              aria-label={i18n._('Refresh')}
              disabled={rootQuery.isFetching}
              marginLeft="auto"
              onClick={() => rootQuery.refetch()}
            >
              {rootQuery.isFetching ? <Spinner size="xs" aria-hidden="true" /> : <RefreshIcon aria-hidden="true" size="1em" />}
            </Button>
          </Flex>
          <Box
            ref={dropzoneRef}
            className={`${watchDirectoryStyles.dropzone} ${dragging ? watchDirectoryStyles.dropzoneOver : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Flex
              alignItems="center"
              fontWeight="bold"
              px="3x"
              py="2x"
            >
              <Box flex="1">{i18n._('Name')}</Box>
              <Box width="24%">{i18n._('Date modified')}</Box>
              <Box width="14%">{i18n._('Type')}</Box>
              <Box width="10%" textAlign="right">{i18n._('Size')}</Box>
            </Flex>
            {rootQuery.isLoading && (
              <Flex
                alignItems="center"
                justifyContent="center"
                role="status"
                style={{ height: 240 }}
              >
                <Spinner />
                <Space width="2x" />
                {i18n._('Loading...')}
              </Flex>
            )}
            {rootQuery.isError && (
              <Flex
                alignItems="center"
                gap="2x"
                justifyContent="center"
                role="alert"
                style={{ height: 240 }}
              >
                <Box>{i18n._('Unable to load directory')}</Box>
                <Button onClick={() => rootQuery.refetch()}>{i18n._('Retry')}</Button>
              </Flex>
            )}
            {rootQuery.isSuccess && rootNodes.length === 0 && (
              <Flex alignItems="center" justifyContent="center" style={{ height: 240 }}>
                {i18n._('Empty directory')}
              </Flex>
            )}
            {rootQuery.isSuccess && rootNodes.length > 0 && (
              <Box style={{ height: 240, overflowY: 'auto', overflowX: 'hidden' }}>
                <Tree
                  aria-label={i18n._('Watch directory files')}
                  expanded={expanded}
                  id="watch-directory-tree"
                  isSelectable
                  isUnselectable
                  selected={selected}
                  onKeyDown={handleTreeKeyDown}
                  onNodeFocus={handleNodeFocus}
                  onNodeSelect={handleNodeSelect}
                  onNodeToggle={handleNodeToggle}
                >
                  {rootNodes.map(node => (
                    <WatchDirectoryNode
                      key={node.id}
                      node={node}
                      expandedPaths={expanded}
                      onLoadFile={loadFile}
                      rememberNodes={rememberNodes}
                      queryClient={queryClient}
                    />
                  ))}
                </Tree>
              </Box>
            )}
            {dragging && (
              <Box className={watchDirectoryStyles.dropzoneHint}>
                <UploadIcon aria-hidden="true" size="1em" />
                <Space width="2x" />
                {i18n._('Upload G-code')}
              </Box>
            )}
            {uploading && (
              <Box className={watchDirectoryStyles.dropzoneHint}>
                <Box className={watchDirectoryStyles.progressLabel}>
                  <Spinner size="xs" aria-hidden="true" />
                  <Space width="2x" />
                  {i18n._('Upload G-code')} {uploadProgress}%
                </Box>
                <LinearProgress
                  aria-label={i18n._('Upload G-code')}
                  min={0}
                  max={100}
                  value={uploadProgress}
                  variant="determinate"
                />
              </Box>
            )}
          </Box>
        </ModalBody>
        <ModalFooter>
          <Flex alignItems="center" gap="2x">
            <Button onClick={actions.closeModal}>{i18n._('Cancel')}</Button>
            <Button
              variant="primary"
              disabled={!canUpload}
              onClick={() => loadFile(selectedNode || params.selectedNode)}
            >
              {i18n._('Load G-code')}
            </Button>
          </Flex>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default WatchDirectory;
