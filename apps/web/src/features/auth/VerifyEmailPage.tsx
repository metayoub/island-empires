import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { AuthLayout } from './AuthLayout';
import { confirmEmailVerification, requestEmailVerification } from './auth.api';
import { authQueryKey } from './useAuth';
import { errorClassName, helpClassName } from './formStyles';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const queryClient = useQueryClient();
  const confirmMutation = useMutation({
    mutationFn: confirmEmailVerification,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authQueryKey }),
  });
  const resendMutation = useMutation({ mutationFn: requestEmailVerification });

  useEffect(() => {
    if (token) {
      confirmMutation.mutate(token);
    }
  }, [token]);

  return (
    <AuthLayout title="Verify Email">
      {token ? (
        <div className="space-y-4">
          {confirmMutation.isPending ? <p className={helpClassName}>Verifying your email...</p> : null}
          {confirmMutation.isSuccess ? <p className={helpClassName}>Your email is verified.</p> : null}
          {confirmMutation.isError ? <div className={errorClassName}>This verification link is invalid or expired.</div> : null}
          <Link className="font-bold text-primary" to="/">Return to game</Link>
        </div>
      ) : (
        <div className="space-y-4">
          <p className={helpClassName}>Please verify your email address. Check your inbox or resend verification email.</p>
          <Button onClick={() => resendMutation.mutate()} disabled={resendMutation.isPending}>Resend verification email</Button>
          {resendMutation.isSuccess ? <p className={helpClassName}>Verification email sent.</p> : null}
        </div>
      )}
    </AuthLayout>
  );
}
