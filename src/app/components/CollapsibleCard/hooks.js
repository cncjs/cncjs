import { useEffect, useState } from 'react';

export const useStateFromProps = (props) => {
  const [value, setValue] = useState(props);

  useEffect(() => {
    if (value !== props) {
      setValue(props);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props]);

  return [value, setValue];
};
