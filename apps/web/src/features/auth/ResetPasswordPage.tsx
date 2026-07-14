import { useMutation } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { AuthLayout } from './AuthLayout';
import { confirmPasswordReset } from './auth.api';
import { errorClassName, helpClassName, inputClassName, labelClassName } from './formStyles';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => confirmPasswordReset(token, newPassword),
    onSuccess: () => setError(null),
    onError: (err) => setError(err instanceof Error ? err.message : 'Unable to reset password.'),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    mutation.mutate();
  }

  return (
    <AuthLayout title="Choose New Password">
      {!token ? <div className={errorClassName}>This reset link is missing a token.</div> : null}
      {error ? <div className={errorClassName}>{error}</div> : null}
      {mutation.isSuccess ? (
        <p className={helpClassName}>Your password was updated. <Link className="font-bold text-primary" to="/login">Log in</Link></p>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className={labelClassName}>
            New password
            <input className={inputClassName} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} type="password" minLength={8} required disabled={!token} />
          </label>
          <Button className="w-full" type="submit" disabled={!token || mutation.isPending}>Update password</Button>
        </form>
      )}
    </AuthLayout>
  );
}
