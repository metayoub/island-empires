import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { AuthLayout } from './AuthLayout';
import { login } from './auth.api';
import { authQueryKey } from './useAuth';
import { errorClassName, helpClassName, inputClassName, labelClassName } from './formStyles';

export function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authQueryKey });
      navigate('/');
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Unable to log in.'),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    mutation.mutate({ email, password });
  }

  return (
    <AuthLayout title="Log In">
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error ? <div className={errorClassName}>{error}</div> : null}
        <label className={labelClassName}>
          Email
          <input className={inputClassName} value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
        </label>
        <label className={labelClassName}>
          Password
          <input className={inputClassName} value={password} onChange={(event) => setPassword(event.target.value)} type="password" required />
        </label>
        <Button className="w-full" type="submit" disabled={mutation.isPending}>Log In</Button>
      </form>
      <div className={`${helpClassName} flex justify-between gap-3`}>
        <Link className="font-bold text-primary" to="/forgot-password">Forgot password?</Link>
        <Link className="font-bold text-primary" to="/register">Create account</Link>
      </div>
    </AuthLayout>
  );
}
