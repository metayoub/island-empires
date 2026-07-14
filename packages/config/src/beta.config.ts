export const BETA_CONFIG = {
  betaModeEnabled: true,
  accessMode: 'invite_code' as 'invite_code' | 'email_allowlist',
  supportedAccessModes: ['invite_code', 'email_allowlist'],
  maxPlayersInBetaWorld: 500,
  inviteCodeRequired: true,
  allowWaitlistSignup: true,

  betaWorld: {
    name: 'Beta World 1',
    status: 'beta',
    maxPlayers: 500,
  },

  feedback: {
    titleMaxLength: 120,
    messageMaxLength: 3000,
    submissionsPerHour: 5,
  },

  retention: {
    d1WindowHoursStart: 20,
    d1WindowHoursEnd: 48,
  },
} as const;
