import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { AuthLayout } from './AuthLayout';
import { registerAccount } from './auth.api';
import { authQueryKey } from './useAuth';
import { errorClassName, helpClassName, inputClassName, labelClassName } from './formStyles';

export function RegisterPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: registerAccount,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authQueryKey });
      navigate('/');
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Unable to create account.'),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (displayName.trim().length < 3) {
      setError('Display name must be at least 3 characters.');
      return;
    }
    mutation.mutate({ email, password, displayName, acceptTerms, acceptPrivacy, inviteCode });
  }

  return (
    <AuthLayout title="Create Account">
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error ? <div className={errorClassName}>{error}</div> : null}
        <label className={labelClassName}>
          Email
          <input className={inputClassName} value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
        </label>
        <label className={labelClassName}>
          Display name
          <input className={inputClassName} value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
        </label>
        <label className={labelClassName}>
          Password
          <input className={inputClassName} value={password} onChange={(event) => setPassword(event.target.value)} type="password" minLength={8} required />
        </label>
        <label className={labelClassName}>
          Beta invite code
          <input className={inputClassName} value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} required />
        </label>
        <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm font-semibold text-text">
          This is a beta world. Progress may be reset before public launch.
        </div>
        <label className="flex items-start gap-2 text-sm font-semibold text-text">
          <input type="checkbox" checked={acceptTerms} onChange={(event) => setAcceptTerms(event.target.checked)} required />
          I accept the terms.
        </label>
        <label className="flex items-start gap-2 text-sm font-semibold text-text">
          <input type="checkbox" checked={acceptPrivacy} onChange={(event) => setAcceptPrivacy(event.target.checked)} required />
          I accept the privacy policy.
        </label>
        <Button className="w-full" type="submit" disabled={mutation.isPending}>Create Account</Button>
      </form>
      <p className={helpClassName}>
        Already have an account? <Link className="font-bold text-primary" to="/login">Log in</Link>
      </p>
    </AuthLayout>
  );
}
