import { useQuery } from '@tanstack/react-query';
import { getCurrentUser } from './auth.api';

export const authQueryKey = ['auth', 'me'] as const;

export function useAuth() {
  return useQuery({
    queryKey: authQueryKey,
    queryFn: getCurrentUser,
    retry: false,
  });
}
