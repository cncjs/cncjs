import path from 'path';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ensureArray } from 'ensure-type';
import api from '@app/api';

export const WATCH_DIRECTORY_QUERY_KEY = 'watch-directory';

/**
 * @param {string} value
 * @returns {string}
 */
export const normalizeWatchDirectoryPath = (value = '') => {
  const input = String(value || '').replace(/\\/g, '/');
  const normalized = path.posix.normalize(input);

  if (normalized === '.' || normalized === '/') {
    return '';
  }

  return normalized
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');
};

/**
 * @param {string} value
 * @returns {Array<string>}
 */
export const watchDirectoryQueryKey = (value = '') => ([
  WATCH_DIRECTORY_QUERY_KEY,
  normalizeWatchDirectoryPath(value),
]);

/**
 * @param {{ queryKey: Array<string> }} context
 * @returns {Promise<object>}
 */
export const fetchWatchDirectory = async ({ queryKey }) => {
  const directoryPath = queryKey[1];
  const response = await api.watch.getFiles({ path: directoryPath });
  return response.body;
};

/**
 * @param {string} value
 * @returns {{ queryKey: Array<string>, queryFn: Function, retry: boolean }}
 */
export const watchDirectoryQueryOptions = (value = '') => ({
  queryKey: watchDirectoryQueryKey(value),
  queryFn: fetchWatchDirectory,
  retry: false,
});

/**
 * @param {object} body
 * @returns {Array<object>}
 */
export const mapWatchDirectoryNodes = (body = {}) => {
  const directoryPath = normalizeWatchDirectoryPath(body.path);

  return ensureArray(body.files).map((file) => {
    const { name, ...props } = file;
    const nodePath = normalizeWatchDirectoryPath(path.posix.join(directoryPath, name));

    return {
      id: nodePath,
      name,
      props: {
        ...props,
        path: directoryPath,
      },
      loadOnDemand: props.type === 'd',
    };
  });
};

/**
 * @param {string} value
 * @param {object} options
 * @returns {object}
 */
export const useWatchDirectoryQuery = (value = '', options = {}) => useQuery({
  ...watchDirectoryQueryOptions(value),
  ...options,
});

/**
 * @param {{ file: string, data: string, onProgress?: Function }} variables
 * @returns {Promise<object>}
 */
export const uploadWatchDirectoryFile = ({ file, data, onProgress }) => api.watch.uploadFile({
  file,
  data,
  onProgress,
});

/**
 * @param {object} options
 * @returns {object}
 */
export const useUploadWatchDirectoryFileMutation = (options = {}) => useMutation({
  mutationFn: uploadWatchDirectoryFile,
  retry: false,
  ...options,
});
