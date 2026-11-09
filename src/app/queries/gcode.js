import { useMutation } from '@tanstack/react-query';
import api from '@app/api';

/**
 * Load G-code metadata through the API boundary.
 *
 * @returns {import('@tanstack/react-query').UseMutationResult}
 */
export const useLoadGCodeMutation = () => useMutation({
  retry: false,
  mutationFn: async ({ meta, context }) => (await api.loadGCode(meta, context)).body,
});
