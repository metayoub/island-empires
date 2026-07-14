"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ADMIN_CONFIG = void 0;
exports.ADMIN_CONFIG = {
  roles: ["super_admin", "operator", "moderator", "support", "viewer"],
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
};
