import { useCallback, useState, useEffect } from 'react';

const useStorage = (key, defaultValue, storageObject) => {
  const [value, setValue] = useState(() => {
    const jsonValue = storageObject.getItem(key);
    if (jsonValue !== null && jsonValue !== undefined) {
      return JSON.parse(jsonValue);
    }

    if (typeof initialValue === 'function') {
      return defaultValue();
    }

    return defaultValue;
  });

  // eslint-disable-next-line consistent-return
  useEffect(() => {
    if (value === undefined) {
      return storageObject.removeItem(key);
    }
    storageObject.setItem(key, JSON.stringify(value));
  }, [key, value, storageObject]);

  const remove = useCallback(() => {
    setValue(undefined);
  }, []);

  return [value, setValue, remove];
};

export default useStorage;
