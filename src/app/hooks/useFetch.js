import useAsync from './useAsync';

const defaultOptions = {
  headers: {
    'Content-Type': 'application/json',
  },
};

const useFetch = (url, options = {}, dependencies = []) => {
  return useAsync(() => {
    options = {
      ...defaultOptions,
      ...options,
    };
    return fetch(url, options).then(response => {
      return response.text()
        .then(data => {
          const { ok, status, headers } = response;

          if (!ok) {
            const error = new Error(data);
            error.response = response;
            throw error;
          }

          try {
            // try parsing JSON string
            data = JSON.parse(data);
          } catch (e) {
            // ignore error
          }

          return {
            ok,
            status,
            headers,
            data,
          };
        });
    });
  }, dependencies);
};

export default useFetch;
