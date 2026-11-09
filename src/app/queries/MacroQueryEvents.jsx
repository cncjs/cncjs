import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import controller from '@app/lib/controller';
import { API_MACROS_QUERY_KEY } from './macros';

const MacroQueryEvents = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const onConfigChange = () => {
      queryClient.invalidateQueries({ queryKey: API_MACROS_QUERY_KEY });
    };

    controller.addListener('config:change', onConfigChange);

    return () => {
      controller.removeListener('config:change', onConfigChange);
    };
  }, [queryClient]);

  return null;
};

export default MacroQueryEvents;
