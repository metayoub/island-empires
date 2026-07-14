export const ADMIN_CONFIG = {
  roles: ['super_admin', 'operator', 'moderator', 'support', 'viewer'],
  defaultPageSize: 50,
  moderation: {
    maxMuteDays: 30,
    maxSuspendDays: 30,
    warningPublicMessageMaxLength: 500,
    internalNoteMaxLength: 2000,
    adminNoteMaxLength: 2000,
  },
  permissions: {
    banRequiresSuperAdmin: true,
  },
} as const;

export type AdminRole = (typeof ADMIN_CONFIG.roles)[number];
