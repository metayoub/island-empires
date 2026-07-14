import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingState } from '../../components/ui/LoadingState';
import { logout } from './auth.api';
import { authQueryKey } from './useAuth';

export function LogoutPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: logout,
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: authQueryKey });
      navigate('/login');
    },
  });

  useEffect(() => {
    mutation.mutate();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg p-6">
      <LoadingState message="Logging out..." />
    </main>
  );
}
