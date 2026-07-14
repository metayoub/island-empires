export const NOTIFICATION_TYPES = {
  CONSTRUCTION_COMPLETED: 'construction_completed',
  RESEARCH_COMPLETED: 'research_completed',
  TRADE_ARRIVED: 'trade_arrived',
  ARMY_RETURNED: 'army_returned',
  INCOMING_ATTACK: 'incoming_attack',
  ALLIANCE_MESSAGE: 'alliance_message',
  WAREHOUSE_FULL: 'warehouse_full',
  EVENT_ANNOUNCEMENT: 'event_announcement',
  EVENT_REWARD: 'event_reward',
  EVENT_ENDING: 'event_ending',
  MESSAGE: 'message',
  SYSTEM: 'system',
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

export const NOTIFICATION_THROTTLE_SECONDS: Record<string, number> = {
  [NOTIFICATION_TYPES.WAREHOUSE_FULL]: 6 * 60 * 60,
  [NOTIFICATION_TYPES.EVENT_ENDING]: 24 * 60 * 60,
};

export const NOTIFICATION_EMAIL_TEMPLATES: Record<
  NotificationType,
  { subject: string; preheader: string; body: string }
> = {
  [NOTIFICATION_TYPES.CONSTRUCTION_COMPLETED]: {
    subject: 'Construction completed',
    preheader: 'A building upgrade is ready to review.',
    body: 'A building upgrade has completed in your empire. You can review it when convenient.',
  },
  [NOTIFICATION_TYPES.RESEARCH_COMPLETED]: {
    subject: 'Research completed',
    preheader: 'A technology has finished researching.',
    body: 'A technology has finished researching. Your research screen has the details.',
  },
  [NOTIFICATION_TYPES.TRADE_ARRIVED]: {
    subject: 'Trade arrived',
    preheader: 'A shipment has reached its destination.',
    body: 'A shipment has arrived. The trade report is available in your notification center.',
  },
  [NOTIFICATION_TYPES.ARMY_RETURNED]: {
    subject: 'Army returned',
    preheader: 'A deployed army has returned.',
    body: 'A deployed army has returned home. The report is available in your notification center.',
  },
  [NOTIFICATION_TYPES.INCOMING_ATTACK]: {
    subject: 'Battle report available',
    preheader: 'A defensive battle has been resolved.',
    body: 'A defensive battle report is available. Open the game for the full details.',
  },
  [NOTIFICATION_TYPES.ALLIANCE_MESSAGE]: {
    subject: 'Alliance message',
    preheader: 'Your alliance has a new message.',
    body: 'Your alliance has a new message. Open the alliance chat when convenient.',
  },
  [NOTIFICATION_TYPES.WAREHOUSE_FULL]: {
    subject: 'Warehouse full',
    preheader: 'One of your cities has reached storage capacity.',
    body: 'One of your cities has reached storage capacity. You can review storage when convenient.',
  },
  [NOTIFICATION_TYPES.EVENT_ANNOUNCEMENT]: {
    subject: 'Event available',
    preheader: 'A limited-time event is available.',
    body: 'A limited-time event is available. You can review it when convenient.',
  },
  [NOTIFICATION_TYPES.EVENT_REWARD]: {
    subject: 'Event reward claimed',
    preheader: 'Your event reward was added.',
    body: 'Your event reward has been added to your empire.',
  },
  [NOTIFICATION_TYPES.EVENT_ENDING]: {
    subject: 'Event ending soon',
    preheader: 'A game event is nearing its end.',
    body: 'A game event is nearing its end. You can review the event when convenient.',
  },
  [NOTIFICATION_TYPES.MESSAGE]: {
    subject: 'New message',
    preheader: 'A new message is available.',
    body: 'A new message is available in your inbox.',
  },
  [NOTIFICATION_TYPES.SYSTEM]: {
    subject: 'Game notice',
    preheader: 'A game notice is available.',
    body: 'A game notice is available in your notification center.',
  },
};
