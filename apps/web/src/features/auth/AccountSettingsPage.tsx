import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/ErrorState';
import { LoadingState } from '../../components/ui/LoadingState';
import { getAccountSettings, requestAccountDeletion, updateAccountSettings } from './auth.api';
import { authQueryKey } from './useAuth';
import { errorClassName, helpClassName, inputClassName, labelClassName } from './formStyles';

export function AccountSettingsPage() {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: ['account', 'settings'],
    queryFn: getAccountSettings,
  });
  const [displayName, setDisplayName] = useState('');
  const [showProfile, setShowProfile] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (settingsQuery.data) {
      setDisplayName(settingsQuery.data.displayName);
      setShowProfile(settingsQuery.data.privacy.showProfile);
    }
  }, [settingsQuery.data]);

  const updateMutation = useMutation({
    mutationFn: updateAccountSettings,
    onSuccess: async () => {
      setMessage('Account settings saved.');
      setError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['account', 'settings'] }),
        queryClient.invalidateQueries({ queryKey: authQueryKey }),
        queryClient.invalidateQueries({ queryKey: ['bootstrap'] }),
      ]);
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Unable to save settings.'),
  });
  const deletionMutation = useMutation({
    mutationFn: requestAccountDeletion,
    onSuccess: async () => {
      setMessage('Account deletion requested.');
      await queryClient.invalidateQueries({ queryKey: ['account', 'settings'] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Unable to request deletion.'),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    updateMutation.mutate({ displayName, privacy: { showProfile } });
  }

  if (settingsQuery.isLoading) {
    return <LoadingState message="Loading account settings..." />;
  }
  if (settingsQuery.isError || !settingsQuery.data) {
    return <ErrorState title="Unable to load account settings." onRetry={() => void settingsQuery.refetch()} />;
  }

  return (
    <div className="space-y-6">
      <section className="game-surface game-frame rounded-lg p-5">
        <h2 className="text-xl font-black">Account Settings</h2>
        <p className={helpClassName}>Email: {settingsQuery.data.email}</p>
        <p className={helpClassName}>
          Verification: {settingsQuery.data.emailVerified ? 'Verified' : 'Not verified'}
        </p>
        {message ? <p className={helpClassName}>{message}</p> : null}
        {error ? <div className={errorClassName}>{error}</div> : null}
        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <label className={labelClassName}>
            Display name
            <input className={inputClassName} value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-text">
            <input type="checkbox" checked={showProfile} onChange={(event) => setShowProfile(event.target.checked)} />
            Show my public profile
          </label>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={updateMutation.isPending}>Save settings</Button>
            <Link to="/logout"><Button variant="secondary">Logout</Button></Link>
          </div>
        </form>
      </section>
      <section className="game-surface game-frame rounded-lg border-danger/30 p-5">
        <h3 className="text-lg font-black text-danger">Account deletion</h3>
        <p className={helpClassName}>For Sprint 12 this marks your account as pending deletion. Data is not permanently deleted yet.</p>
        <Button variant="danger" onClick={() => deletionMutation.mutate()} disabled={deletionMutation.isPending || settingsQuery.data.accountStatus === 'pending_deletion'}>
          Request account deletion
        </Button>
      </section>
    </div>
  );
}
