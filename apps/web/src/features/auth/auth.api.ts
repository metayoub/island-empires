import { apiGet, apiPatch, apiPost } from '../../services/api/client';

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  accountStatus?: string;
};

export type AuthPlayer = {
  id: string;
  name: string;
  selectedCityId?: string | null;
};

export type AuthResponse = {
  user: AuthUser;
  player: AuthPlayer;
};

export function getCurrentUser(): Promise<AuthResponse> {
  return apiGet<AuthResponse>('/api/auth/me');
}

export function registerAccount(body: {
  email: string;
  password: string;
  displayName: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  inviteCode?: string;
}): Promise<AuthResponse> {
  return apiPost<AuthResponse>('/api/auth/register', body);
}

export function login(body: { email: string; password: string }): Promise<AuthResponse> {
  return apiPost<AuthResponse>('/api/auth/login', body);
}

export function logout(): Promise<{ success: true }> {
  return apiPost<{ success: true }>('/api/auth/logout', {});
}

export function requestEmailVerification(): Promise<{ success: true }> {
  return apiPost<{ success: true }>('/api/auth/email-verification/request', {});
}

export function confirmEmailVerification(token: string): Promise<{ success: true; emailVerified: true }> {
  return apiPost<{ success: true; emailVerified: true }>('/api/auth/email-verification/confirm', {
    token,
  });
}

export function requestPasswordReset(email: string): Promise<{ success: true }> {
  return apiPost<{ success: true }>('/api/auth/password-reset/request', { email });
}

export function confirmPasswordReset(
  token: string,
  newPassword: string,
): Promise<{ success: true }> {
  return apiPost<{ success: true }>('/api/auth/password-reset/confirm', {
    token,
    newPassword,
  });
}

export type AccountSettings = {
  email: string;
  displayName: string;
  emailVerified: boolean;
  privacy: {
    showProfile: boolean;
  };
  accountStatus: string;
};

export function getAccountSettings(): Promise<AccountSettings> {
  return apiGet<AccountSettings>('/api/account/settings');
}

export function updateAccountSettings(body: {
  displayName?: string;
  privacy?: { showProfile: boolean };
}): Promise<{ success: true }> {
  return apiPatch<{ success: true }>('/api/account/settings', body);
}

export function requestAccountDeletion(): Promise<{ success: true; accountStatus: string }> {
  return apiPost<{ success: true; accountStatus: string }>('/api/account/delete-request', {});
}
