import { useMutation } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { AuthLayout } from './AuthLayout';
import { requestPasswordReset } from './auth.api';
import { helpClassName, inputClassName, labelClassName } from './formStyles';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const mutation = useMutation({ mutationFn: requestPasswordReset });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate(email);
  }

  return (
    <AuthLayout title="Reset Password">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className={labelClassName}>
          Email
          <input className={inputClassName} value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
        </label>
        <Button className="w-full" type="submit" disabled={mutation.isPending}>Send reset link</Button>
      </form>
      {mutation.isSuccess ? <p className={helpClassName}>If that email exists, a reset link has been sent.</p> : null}
      <p className={helpClassName}><Link className="font-bold text-primary" to="/login">Back to login</Link></p>
    </AuthLayout>
  );
}
