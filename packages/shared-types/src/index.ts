export type HealthStatus = {
  status: 'ok';
  service: string;
  timestamp: string;
};

export type AdminRole =
  | 'super_admin'
  | 'operator'
  | 'moderator'
  | 'support'
  | 'viewer';

export type ModerationActionType =
  | 'warning'
  | 'mute'
  | 'suspend'
  | 'ban';

export type ModerationActionStatus =
  | 'active'
  | 'expired'
  | 'revoked';

export type AdminPlayerSummary = {
  playerId: string;
  playerName: string;
  userId: string;
  email: string;
  worldId: string;
  worldName: string;
  allianceTag: string | null;
  score: number;
  cityCount: number;
  accountStatus: string;
  moderationStatus: {
    muted: boolean;
    suspended: boolean;
    banned: boolean;
  };
  createdAt: string;
};

export type AdminActionLogSummary = {
  id: string;
  adminUserId: string;
  adminEmail?: string;
  actionType: string;
  targetType?: string | null;
  targetId?: string | null;
  reason?: string | null;
  createdAt: string;
};

export type ResourceBalance = {
  wood: number;
  gold: number;
  marble: number;
  wine: number;
  crystal: number;
  sulfur: number;
};

export type ResourceCost = ResourceBalance;

export type ConditionType =
  | 'resource_required'
  | 'building_level_required'
  | 'research_required'
  | 'city_population_required'
  | 'city_happiness_required'
  | 'island_resource_required'
  | 'warehouse_capacity_required'
  | 'previous_unit_required';

export type ConditionSummary = {
  type: ConditionType;
  label: string;
  met?: boolean;
  current?: number | string;
  resourceType?: keyof ResourceBalance;
  amount?: number;
  buildingType?: string;
  level?: number;
  technologyId?: string;
  population?: number;
  happiness?: number;
  capacity?: number;
  unitType?: string;
  quantity?: number;
};

export type BuildingMilestoneSummary = {
  level: number;
  title: string;
  description: string;
  isReached: boolean;
  conditions?: ConditionSummary[];
};

export type CityResourcesResponse = ResourceBalance & {
  lastCalculatedAt: string;
};

export type CitySummary = {
  id: string;
  name: string;
  level: number;
  population: number;
  populationCapacity: number;
  happiness: number;
  island?: {
    id: string;
    name: string;
    x: number;
    y: number;
    luxuryResource: string;
  } | null;
};

export type PopulationSummary = {
  current: number;
  capacity: number;
  growthPerHour: number;
  isAtCapacity: boolean;
  lastCalculatedAt: string;
};

export type HappinessSummary = {
  value: number;
  base: number;
  tavernBonus: number;
  healthSupport: number;
  healthPressureRelief: number;
  healthGrowthBonusPercent: number;
  populationPressure: number;
  administrationPenalty: number;
  status: 'unhappy' | 'neutral' | 'happy' | 'very_happy';
};

export type CitizenSummary = {
  woodWorkers: number;
  goldWorkers: number;
  luxuryWorkers: number;
  scientists: number;
  idleCitizens: number;
};

export type CityBuildingSummary = {
  id: string;
  type: string;
  name: string;
  level: number;
  slotIndex: number;
  status: string;
  description: string;
  canUpgrade: boolean;
  disabledReason?: string;
  upgradeCost?: ResourceCost;
  upgradeDurationSeconds?: number;
  upgradeStartedAt?: string | null;
  upgradeFinishesAt?: string | null;
  maxLevel?: number;
  nextMilestone?: BuildingMilestoneSummary | null;
  milestones?: BuildingMilestoneSummary[];
};

export type ActiveConstructionSummary = {
  buildingId: string;
  buildingType: string;
  buildingName: string;
  fromLevel: number;
  toLevel: number;
  startedAt: string;
  finishesAt: string;
  remainingSeconds: number;
};

export type BuildingVisualState =
  'not_built' | 'idle' | 'upgrade_available' | 'upgrading' | 'max_level' | 'disabled' | 'selected';

export type CityBuildingHotspot = {
  buildingType: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  rotationDeg?: number;
};

export type BuildingEffectSummary = {
  label: string;
  current: string;
  next?: string;
  note?: string;
};

export type CityViewBuilding = CityBuildingSummary & {
  visualState: BuildingVisualState;
  hotspot: CityBuildingHotspot;
  effects: BuildingEffectSummary[];
};

export type ResourceProduction = {
  woodPerHour: number;
  goldPerHour: number;
  marblePerHour: number;
  winePerHour: number;
  crystalPerHour: number;
  sulfurPerHour: number;
};

export type StorageSummary = {
  capacityPerResource: number;
  fullResources: string[];
};

export type WorkerAssignment = {
  woodWorkers: number;
  goldWorkers: number;
  luxuryWorkers: number;
  scientists: number;
  idleCitizens: number;
};

export type AssignWorkersRequest = {
  woodWorkers: number;
  goldWorkers: number;
  luxuryWorkers: number;
  scientists: number;
};

export type CityProductionResponse = {
  production: ResourceProduction;
  storage: StorageSummary;
  workers: WorkerAssignment;
};

export type AssignWorkersResponse = {
  workers: WorkerAssignment;
  citizens: CitizenSummary;
  production: ResourceProduction;
  research: ResearchSummary;
};

export type TechnologyState = 'locked' | 'available' | 'researching' | 'completed';

export type TechnologySummary = {
  id: string;
  name: string;
  branch: string;
  category?: string;
  tier?: number;
  description: string;
  cost: number;
  durationSeconds: number;
  requirements: string[];
  unlocks?: string[];
  state: TechnologyState;
};

export type ActiveResearch = {
  id: string;
  technologyId: string;
  technologyName: string;
  startedAt: string;
  finishesAt: string;
  remainingSeconds: number;
};

export type ResearchOverview = {
  researchPoints: number;
  researchPointsPerHour: number;
  scientists: number;
  academyLevel: number;
  activeResearch: ActiveResearch | null;
  technologies: TechnologySummary[];
  categories?: Array<{
    id: string;
    name: string;
    count: number;
    completed: number;
    available: number;
  }>;
};

export type ResearchSummary = {
  researchPoints: number;
  researchPointsPerHour: number;
  activeResearch: ActiveResearch | null;
};

export type StartResearchResponse = {
  researchPoints: number;
  activeResearch: ActiveResearch;
};

export type CityOverview = {
  city: CitySummary;
  population: PopulationSummary;
  happiness: HappinessSummary;
  citizens: CitizenSummary;
  resources: CityResourcesResponse;
  production: ResourceProduction;
  storage: StorageSummary;
  research: ResearchSummary;
  workers: WorkerAssignment;
  buildings: CityBuildingSummary[];
  activeConstruction: ActiveConstructionSummary | null;
};

export type SpyMissionType = 'resource_report' | 'army_report' | 'building_report';

export type SpyTrainingJobSummary = {
  id: string;
  quantity: number;
  status?: string;
  finishesAt: string;
  remainingSeconds: number;
};

export type SpyOverviewResponse = {
  city: {
    id: string;
    name: string;
    spyAgencyLevel: number;
  };
  spies: {
    available: number;
    training: number;
  };
  trainingQueue: SpyTrainingJobSummary[];
  unit: {
    cost: ResourceCost;
    trainingTimeSeconds: number;
  };
};

export type TrainSpiesRequest = {
  quantity: number;
};

export type TrainSpiesResponse = {
  trainingJob: {
    id: string;
    quantity: number;
    status: string;
    finishesAt: string;
  };
};

export type SpyMissionOption = {
  missionType: SpyMissionType;
  successChance: number;
  detectionChance: number;
  travelTimeSeconds: number;
  cooldownActive: boolean;
  canStart: boolean;
  disabledReason?: string | null;
};

export type SpyMissionOptionsResponse = {
  originCity: {
    id: string;
    name: string;
    spyAgencyLevel: number;
    availableSpies: number;
  };
  targetCity: {
    id: string;
    name: string;
    playerName: string;
    beginnerProtectionActive: boolean;
  };
  missions: SpyMissionOption[];
};

export type StartSpyMissionRequest = {
  originCityId: string;
  targetCityId: string;
  missionType: SpyMissionType;
};

export type SpyMissionSummary = {
  id: string;
  missionType: SpyMissionType;
  status: string;
  successChance: number;
  detectionChance: number;
  arrivalTime?: string | null;
  remainingSeconds?: number | null;
  originCityName?: string;
  targetCityName?: string;
  wasSuccessful?: boolean | null;
  wasDetected?: boolean | null;
  spyLost?: boolean | null;
  reportId?: string | null;
  createdAt?: string;
};

export type StartSpyMissionResponse = {
  mission: SpyMissionSummary;
};

export type SpyMissionListResponse = {
  missions: SpyMissionSummary[];
};

export type CityPopulationResponse = {
  population: PopulationSummary;
  happiness: HappinessSummary;
  citizens: CitizenSummary;
};

export type StartBuildingUpgradeResponse = {
  building: CityBuildingSummary;
  resources: CityResourcesResponse;
  activeConstruction: ActiveConstructionSummary;
};

export type ReportSummary = {
  id: string;
  type: string;
  category?: 'battle' | 'trade' | 'construction' | 'research' | 'intelligence' | 'system';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export type NotificationType =
  | 'construction_completed'
  | 'research_completed'
  | 'trade_arrived'
  | 'army_returned'
  | 'incoming_attack'
  | 'alliance_message'
  | 'warehouse_full'
  | 'event_announcement'
  | 'event_reward'
  | 'event_ending'
  | 'message'
  | 'system';

export type NotificationChannel = 'in_game' | 'email' | 'browser_push';

export type NotificationSettings = {
  inGameEnabled: boolean;
  emailEnabled: boolean;
  browserPushEnabled: boolean;
  constructionCompleted: boolean;
  researchCompleted: boolean;
  tradeArrived: boolean;
  armyReturned: boolean;
  incomingAttack: boolean;
  allianceMessage: boolean;
  warehouseFull: boolean;
  eventEnding: boolean;
  quietHoursStart: number | null;
  quietHoursEnd: number | null;
};

export type UpdateNotificationSettingsRequest = Partial<NotificationSettings>;

export type BrowserPushSubscriptionRequest = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
};

export type BrowserPushSubscriptionResponse = {
  id: string;
  endpoint: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BrowserPushSubscriptionListResponse = {
  subscriptions: BrowserPushSubscriptionResponse[];
};

export type NotificationDeliverySummary = {
  id: string;
  type: NotificationType;
  channel: NotificationChannel;
  status: 'pending' | 'delivered' | 'skipped' | 'failed';
  title: string;
  body: string;
  reportId: string | null;
  messageId: string | null;
  createdAt: string;
  deliveredAt: string | null;
  readAt: string | null;
  archivedAt: string | null;
};

export type ClearNotificationsResponse = {
  archivedCount: number;
};

export type SendMessageRequest = {
  recipientPlayerId: string;
  subject: string;
  body: string;
};

export type MessageSummary = {
  id: string;
  messageType: 'player' | 'system';
  subject: string;
  bodyPreview: string;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
  sender: {
    id: string;
    name: string;
  } | null;
  recipient: {
    id: string;
    name: string;
  };
};

export type MessageDetail = MessageSummary & {
  body: string;
};

export type MessageListResponse = {
  messages: MessageSummary[];
};

export type SendMessageResponse = {
  message: MessageDetail;
};

export type BlockPlayerRequest = {
  reason?: string;
};

export type BlockPlayerResponse = {
  blockedPlayerId: string;
  blockedPlayerName: string;
  reason: string | null;
  createdAt: string;
};

export type ReportMessageRequest = {
  reason: string;
};

export type ReportMessageResponse = {
  reportId: string;
  status: 'pending';
};

export type ModerationQueueResponse = {
  queue: Array<{
    id: string;
    messageId: string;
    reporterPlayerId: string;
    reporterPlayerName: string;
    reason: string;
    status: string;
    createdAt: string;
  }>;
};

export type AllianceRole = 'leader' | 'officer' | 'recruiter' | 'member';
export type AllianceProjectType =
  | 'trade_harbor'
  | 'research_library'
  | 'defensive_monument'
  | 'island_festival';
export type AllianceProjectStatus = 'active' | 'completed';
export type AllianceFeedType =
  | 'donation'
  | 'project_started'
  | 'project_completed'
  | 'help_request'
  | 'trade_request'
  | 'battle_report_shared';

export type AllianceSummary = {
  id: string;
  name: string;
  tag: string;
  description: string;
  status: string;
  memberCount: number;
  createdAt: string;
};

export type AllianceMemberSummary = {
  id: string;
  playerId: string;
  playerName: string;
  role: AllianceRole;
  contributionScore?: number;
  joinedAt: string;
};

export type AllianceAnnouncementSummary = {
  id: string;
  playerId: string;
  playerName: string;
  title: string;
  body: string;
  createdAt: string;
};

export type AllianceDetail = AllianceSummary & {
  myRole: AllianceRole | null;
  members: AllianceMemberSummary[];
  announcements: AllianceAnnouncementSummary[];
  treasury?: ResourceBalance;
  activeProjects?: AllianceProjectSummary[];
  bonuses?: AllianceBonusSummary[];
  activityFeed?: AllianceActivityFeedEntry[];
  contributionLeaderboard?: AllianceContributionSummary[];
};

export type AllianceListResponse = {
  alliances: AllianceSummary[];
};

export type AllianceDetailResponse = {
  alliance: AllianceDetail | null;
};

export type CreateAllianceRequest = {
  name: string;
  tag: string;
  description?: string;
};

export type UpdateAllianceProfileRequest = Partial<CreateAllianceRequest>;

export type AllianceApplicationSummary = {
  id: string;
  allianceId: string;
  allianceName: string;
  playerId: string;
  playerName: string;
  message: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
};

export type AllianceApplicationListResponse = {
  applications: AllianceApplicationSummary[];
};

export type ApplyToAllianceRequest = {
  message?: string;
};

export type AllianceInvitationSummary = {
  id: string;
  allianceId: string;
  allianceName: string;
  allianceTag: string;
  inviteePlayerId: string;
  inviteePlayerName: string;
  invitedById: string;
  invitedByName: string;
  message: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
};

export type AllianceInvitationListResponse = {
  invitations: AllianceInvitationSummary[];
};

export type InvitePlayerRequest = {
  playerId: string;
  message?: string;
};

export type AllianceChatMessageSummary = {
  id: string;
  playerId: string;
  playerName: string;
  body: string;
  createdAt: string;
};

export type AllianceChatResponse = {
  messages: AllianceChatMessageSummary[];
};

export type CreateAllianceChatMessageRequest = {
  body: string;
};

export type CreateAllianceAnnouncementRequest = {
  title: string;
  body: string;
};

export type AllianceActionResponse = {
  success: true;
  status?: 'accepted' | 'rejected';
};

export type AllianceProjectSummary = {
  id: string;
  projectType: AllianceProjectType;
  name: string;
  description: string;
  status: AllianceProjectStatus;
  cost: ResourceCost;
  contributed: ResourceBalance;
  progressPercent: number;
  bonus: AllianceBonusSummary;
  startedByName: string;
  completedAt: string | null;
  createdAt: string;
};

export type AllianceBonusSummary = {
  bonusType: string;
  label: string;
  description: string;
  value: number;
  unlockedAt?: string;
};

export type AllianceActivityFeedEntry = {
  id: string;
  type: AllianceFeedType;
  playerName: string;
  message: string;
  payload?: unknown;
  createdAt: string;
};

export type AllianceContributionSummary = {
  playerId: string;
  playerName: string;
  role: AllianceRole;
  contributionScore: number;
};

export type AllianceRankingSummary = {
  allianceId: string;
  allianceName: string;
  allianceTag: string;
  memberCount: number;
  completedProjects: number;
  contributionScore: number;
  rank: number;
};

export type AllianceCooperationOverviewResponse = {
  treasury: ResourceBalance;
  activeProjects: AllianceProjectSummary[];
  bonuses: AllianceBonusSummary[];
  activityFeed: AllianceActivityFeedEntry[];
  contributionLeaderboard: AllianceContributionSummary[];
  rankings: AllianceRankingSummary[];
};

export type DonateToAllianceRequest = ResourceBalance & {
  cityId: string;
  projectId?: string;
};

export type StartAllianceProjectRequest = {
  projectType: AllianceProjectType;
};

export type AllianceHelpRequestKind = 'resources' | 'defense' | 'advice';

export type CreateAllianceHelpRequestRequest = {
  kind: AllianceHelpRequestKind;
  message: string;
  cityId?: string;
};

export type CreateAllianceTradeRequestRequest = {
  offeredResource: keyof ResourceBalance;
  offeredAmount: number;
  requestedResource: keyof ResourceBalance;
  requestedAmount: number;
  message?: string;
};

export type ShareAllianceBattleReportRequest = {
  reportId: string;
  message?: string;
};

export type NotificationCenterResponse = {
  unread: {
    total: number;
    messages: number;
    reports: number;
    notifications: number;
  };
  settings: NotificationSettings;
  deliveries: NotificationDeliverySummary[];
  messages: MessageSummary[];
  reports: ReportSummary[];
};

export type UnreadCounterResponse = {
  total: number;
  messages: number;
  reports: number;
  notifications: number;
};

export type ResourceAmount = ResourceBalance;

export type TransportPayload = ResourceAmount;

export type TransportDestinationOption = {
  cityId: string;
  cityName: string;
  islandId: string;
  islandName: string;
  distance: number;
  travelTimeSeconds: number;
};

export type TransportOptionsResponse = {
  originCityId: string;
  originCityName: string;
  originPortLevel: number;
  capacity: number;
  totalShips: number;
  availableShips: number;
  shipCapacity: number;
  availableCapacity: number;
  resources: CityResourcesResponse;
  destinations: TransportDestinationOption[];
};

export type StartResourceTransportRequest = {
  originCityId: string;
  destinationCityId: string;
  resources: TransportPayload;
};

export type StartTransportRequest = StartResourceTransportRequest;

export type CancelTransportResponse = {
  movement: MovementSummary;
  resources: CityResourcesResponse;
};

export type MovementSummary = {
  id: string;
  movementType: string;
  status: string;
  originCity: {
    id: string;
    name: string;
  };
  destinationCity: {
    id: string;
    name: string;
  } | null;
  destination: {
    cityId?: string;
    cityName?: string;
    islandId?: string;
    islandName?: string;
    slotIndex?: number | null;
  } | null;
  departureTime: string;
  arrivalTime: string;
  returnArrivalTime?: string | null;
  remainingSeconds: number;
  payload: {
    resources: TransportPayload;
    capacityUsed: number;
    capacityLimit: number;
    shipCapacity?: number;
    shipsUsed?: number;
    travelTimeSeconds?: number;
  } | null;
};

export type StartResourceTransportResponse = {
  movement: MovementSummary;
  resources: CityResourcesResponse;
  originResources?: CityResourcesResponse;
};

export type StartTransportResponse = StartResourceTransportResponse;

export type MarketplaceOfferType = 'sell_offer' | 'buy_offer';
export type MarketplaceOfferStatus = 'active' | 'accepted' | 'cancelled' | 'expired' | 'completed';

export type MarketplaceOfferSummary = {
  id: string;
  offerType: MarketplaceOfferType;
  status: MarketplaceOfferStatus;
  offeredResource: keyof ResourceBalance;
  offeredAmount: number;
  requestedResource: keyof ResourceBalance;
  requestedAmount: number;
  creator: {
    playerId: string;
    playerName: string;
    allianceTag: string | null;
  };
  creatorCity: {
    id: string;
    name: string;
    x: number | null;
    y: number | null;
  };
  isOwnOffer: boolean;
  acceptedByPlayerId?: string | null;
  acceptedByCityId?: string | null;
  expiresAt: string;
  acceptedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
};

export type MarketplacePagination = {
  page: number;
  pageSize: number;
  total: number;
};

export type MarketplaceOfferListResponse = {
  offers: MarketplaceOfferSummary[];
  pagination: MarketplacePagination;
};

export type CreateMarketplaceOfferRequest = {
  creatorCityId: string;
  offerType: MarketplaceOfferType;
  offeredResource: keyof ResourceBalance;
  offeredAmount: number;
  requestedResource: keyof ResourceBalance;
  requestedAmount: number;
};

export type CreateMarketplaceOfferResponse = {
  offer: MarketplaceOfferSummary;
};

export type AcceptMarketplaceOfferRequest = {
  acceptingCityId: string;
};

export type AcceptMarketplaceOfferResponse = {
  trade: {
    offerId: string;
    movementId: string;
    status: string;
    arrivalTime: string;
    remainingSeconds: number;
  };
};

export type CancelMarketplaceOfferResponse = {
  success: true;
  status: MarketplaceOfferStatus;
};

export type MarketplaceHistoryEntry = {
  id: string;
  offerId: string;
  sellerPlayerId: string;
  buyerPlayerId: string;
  sellerCityId: string;
  buyerCityId: string;
  resourceFromSeller: keyof ResourceBalance;
  amountFromSeller: number;
  resourceFromBuyer: keyof ResourceBalance;
  amountFromBuyer: number;
  taxFromSellerSide: number;
  taxFromBuyerSide: number;
  movementId: string | null;
  completedAt: string | null;
  createdAt: string;
};

export type MarketplaceTradeHistoryResponse = {
  trades: MarketplaceHistoryEntry[];
  pagination: MarketplacePagination;
};

export type PlayerRankingType = 'overall' | 'gold' | 'army' | 'research' | 'cities';

export type AllianceRankingType =
  | 'overall'
  | 'gold'
  | 'army'
  | 'research'
  | 'members'
  | 'projects';

export type RankingSummary = {
  rank: number;
  score: number;
};

export type PlayerRankingRow = {
  rank: number;
  playerId: string;
  playerName: string;
  alliance: {
    id: string;
    name: string;
    tag: string;
  } | null;
  score: number;
  cityCount: number;
  completedTechs?: number;
};

export type AllianceRankingRow = {
  rank: number;
  allianceId: string;
  name: string;
  tag: string;
  memberCount: number;
  score: number;
};

export type RankingPagination = {
  page: number;
  pageSize: number;
  total: number;
};

export type PlayerRankingsResponse = {
  rankings: PlayerRankingRow[];
  pagination: RankingPagination;
};

export type AllianceRankingsResponse = {
  rankings: AllianceRankingRow[];
  pagination: RankingPagination;
};

export type AdvancedPlayerSearchResult = {
  playerId: string;
  playerName: string;
  alliance: { id: string; name: string; tag: string } | null;
  score: number;
  cityCount: number;
  rank: number;
  beginnerProtected: boolean;
};

export type AdvancedCitySearchResult = {
  cityId: string;
  cityName: string;
  ownerName: string;
  allianceTag: string | null;
  level: number;
  island: { id: string; name: string; x: number; y: number } | null;
  hasPort: boolean;
  hasMarketplace: boolean;
  hasWall: boolean;
  isBlockaded: boolean;
  distance?: number | null;
};

export type AdvancedAllianceSearchResult = {
  allianceId: string;
  name: string;
  tag: string;
  memberCount: number;
  score: number;
  completedProjects: number;
  recruiting: boolean;
  rank: number;
};

export type AdvancedMarketplaceSearchResult = MarketplaceOfferSummary & {
  ratio: number;
  distance?: number | null;
  canAcceptNow: boolean;
};

export type AdvancedSearchResponse<T> = {
  results: T[];
  pagination: RankingPagination;
};

export type QuestStatus = 'locked' | 'active' | 'completed' | 'claimed';

export type QuestReward = {
  resources?: Partial<Record<'wood' | 'gold', number>>;
  researchPoints?: number;
};

export type QuestSummary = {
  id: string;
  title: string;
  description: string;
  objectiveLabel: string;
  status: QuestStatus;
  progress: number;
  target: number;
  rewards: QuestReward;
};

export type QuestOverview = {
  currentQuest: QuestSummary | null;
  quests: QuestSummary[];
};

export type ClaimQuestRewardResponse = {
  claimedQuestId: string;
  rewardsApplied: QuestReward;
  nextQuest: {
    id: string;
    title: string;
    status: QuestStatus;
  } | null;
};

export type NextRecommendedAction = {
  id: string;
  title: string;
  description: string;
  targetScreen: string;
  targetElement?: string;
  questId?: string;
};

export type OnboardingState = {
  hasCompletedTutorial: boolean;
  currentQuestId: string | null;
};

export type BootstrapResponse = {
  player: {
    id: string;
    name: string;
    score: number;
    beginnerProtectionEndsAt?: string | null;
  };
  world: {
    id: string;
    name: string;
    status: string;
  };
  selectedCityId: string;
  onboarding: OnboardingState;
};

export type PremiumWalletSummary = {
  balance: number;
  lifetimePurchased: number;
  lifetimeSpent: number;
  updatedAt: string;
};

export type PremiumCurrencyPackageSummary = {
  id: string;
  name: string;
  premiumCurrency: number;
  priceCents: number;
  currencyCode: string;
};

export type PremiumShopItemType =
  | 'premium_account'
  | 'city_rename'
  | 'player_rename'
  | 'city_skin'
  | 'avatar_frame'
  | 'alliance_banner';

export type PremiumShopItemSummary = {
  id: string;
  name: string;
  type: PremiumShopItemType;
  premiumCurrencyCost: number;
  description: string;
  targetType?: 'city' | 'player' | 'alliance';
  durationDays?: number;
  cosmeticValue?: string;
};

export type PremiumShopResponse = {
  currencyPackages: PremiumCurrencyPackageSummary[];
  items: PremiumShopItemSummary[];
  rules: string[];
};

export type PremiumPurchaseSummary = {
  id: string;
  kind: string;
  itemId: string;
  itemName: string;
  premiumCurrencyAmount: number;
  premiumCurrencyCost: number;
  moneyAmountCents: number;
  currencyCode: string;
  provider: string;
  providerPaymentId?: string | null;
  status: string;
  receiptEmail?: string | null;
  receiptSentAt?: string | null;
  createdAt: string;
};

export type PremiumEntitlementSummary = {
  id: string;
  itemId: string;
  itemType: string;
  targetType?: string | null;
  targetId?: string | null;
  status: string;
  startsAt: string;
  endsAt?: string | null;
  payload?: unknown;
};

export type PremiumRefundSummary = {
  id: string;
  purchaseId: string;
  amountCents: number;
  premiumCurrency: number;
  reason: string;
  status: string;
  providerRefundId?: string | null;
  createdAt: string;
};

export type PremiumAuditLogSummary = {
  id: string;
  actionType: string;
  targetType?: string | null;
  targetId?: string | null;
  payload?: unknown;
  createdAt: string;
};

export type PremiumAccountResponse = {
  wallet: PremiumWalletSummary;
  premiumUntil?: string | null;
  avatarFrame?: string | null;
  entitlements: PremiumEntitlementSummary[];
};

export type PremiumCurrencyPurchaseRequest = {
  packageId: string;
  provider: string;
  providerPaymentId: string;
  receiptEmail?: string;
};

export type PremiumCurrencyPurchaseResponse = {
  purchase: PremiumPurchaseSummary;
  wallet: PremiumWalletSummary;
};

export type PremiumItemPurchaseRequest = {
  itemId: string;
  targetType?: 'city' | 'player' | 'alliance';
  targetId?: string;
  newName?: string;
};

export type PremiumItemPurchaseResponse = {
  purchase: PremiumPurchaseSummary;
  wallet: PremiumWalletSummary;
  entitlement: PremiumEntitlementSummary;
};

export type PremiumHistoryResponse = {
  purchases: PremiumPurchaseSummary[];
  refunds: PremiumRefundSummary[];
  auditLogs: PremiumAuditLogSummary[];
};

export type PremiumRefundResponse = {
  refund: PremiumRefundSummary;
};

export type IslandSummary = {
  id: string;
  name: string;
  x: number;
  y: number;
  mainResource: string;
  luxuryResource: string;
  occupiedSlots: number;
  maxSlots: number;
  hasPlayerCity: boolean;
  distanceFromSelectedCity: number;
  travelTimeSeconds: number;
  cities: Array<{
    id: string;
    name: string;
    level: number;
    slotIndex: number | null;
    playerId: string;
    playerName: string;
    allianceTag: string | null;
    isOwnedByCurrentPlayer: boolean;
  }>;
};

export type WorldMapResponse = {
  world: {
    id: string;
    name: string;
  };
  map: {
    width: number;
    height: number;
  };
  selectedCity: {
    id: string;
    name: string;
    islandId: string;
    x: number;
    y: number;
  };
  islands: IslandSummary[];
};

export type IslandSlotSummary = {
  slotIndex: number;
  status: 'empty' | 'occupied' | 'barbarian_village';
  city: null | {
    id: string;
    name: string;
    level: number;
    playerId: string;
    playerName: string;
    allianceTag: string | null;
    isOwnedByCurrentPlayer: boolean;
    population?: {
      current: number;
      capacity: number;
    };
    workers?: WorkerAssignment;
  };
  barbarianVillage?: {
    id: string;
    name: string;
    level: number;
    enemyStrength: number;
    strengthLabel: string;
    rewards: PveRewards;
  };
  colonization?: {
    canColonize: boolean;
    disabledReason: string | null;
    cost: ResourceCost;
    travelTimeSeconds: number;
  };
};

export type IslandDetailResponse = {
  island: {
    id: string;
    name: string;
    x: number;
    y: number;
    mainResource: string;
    luxuryResource: string;
    maxSlots: number;
  };
  distanceFromSelectedCity: number;
  travelTimeSeconds: number;
  slots: IslandSlotSummary[];
  barbarianVillage: PveCampSummary | null;
};

export type SettleCityResponse = {
  city: CitySummary & {
    islandId: string;
    slotIndex: number;
  };
  resources: CityResourcesResponse;
};

export type PublicCitySummary = {
  id: string;
  name: string;
  level: number;
  population: number;
  player: {
    id: string;
    name: string;
    allianceTag: string | null;
  };
  island: {
    id: string;
    name: string;
    x: number;
    y: number;
    luxuryResource: string;
  } | null;
};

export type PlayerProfileResponse = {
  id: string;
  name: string;
  score: number;
  rank: number | null;
  allianceTag: string | null;
  world: {
    id: string;
    name: string;
  };
  beginnerProtectionEndsAt: string | null;
  cities: PublicCitySummary[];
  createdAt: string;
};

export type WorldRankingEntry = {
  rank: number;
  playerId: string;
  playerName: string;
  allianceTag: string | null;
  score: number;
  cityCount: number;
  population: number;
};

export type WorldRankingResponse = {
  world: {
    id: string;
    name: string;
  };
  rankings: WorldRankingEntry[];
};

export type WorldPopulationStatsResponse = {
  world: {
    id: string;
    name: string;
  };
  players: number;
  cities: number;
  population: number;
  averagePopulationPerPlayer: number;
};

export type PlayerSearchResponse = {
  players: Array<{
    id: string;
    name: string;
    allianceTag: string | null;
    score: number;
    cityCount: number;
    population: number;
  }>;
};

export type CitySearchResponse = {
  cities: PublicCitySummary[];
};

export type UnitType =
  | 'militia'
  | 'spearman'
  | 'archer'
  | 'swordsman'
  | 'cavalry'
  | 'catapult'
  | 'light_ship'
  | 'ram_ship'
  | 'light_galley'
  | 'boarding_skiff'
  | 'ballista_ship'
  | 'war_galley'
  | 'fire_ship'
  | 'heavy_warship'
  | 'spy';

export type UnitCategory = 'land' | 'naval' | 'spy';

export type ArmyUnits = Record<string, number>;

export type UnitCost = {
  wood: number;
  gold: number;
  marble?: number;
  wine?: number;
  crystal?: number;
  sulfur?: number;
};

export type UnitUpkeepSummary = {
  resourceType: keyof UnitCost;
  amountPerHour: number;
};

export type UnitRequirementSummary = {
  buildingType: string;
  buildingName: string;
  requiredLevel: number;
  currentLevel: number;
  met: boolean;
};

export type UnitDefinitionSummary = {
  type: UnitType;
  category?: UnitCategory;
  name: string;
  description: string;
  cost: UnitCost;
  upkeep?: UnitUpkeepSummary;
  trainingSecondsPerUnit: number;
  attack: number;
  defense: number;
  health: number;
  speed?: number;
  capacity?: number;
  requirements?: UnitRequirementSummary[];
  unlockConditions?: ConditionSummary[];
};

export type UnitTrainingOption = UnitDefinitionSummary & {
  canTrain: boolean;
  disabledReason: string | null;
  maxAffordable: number;
};

export type ActiveTrainingSummary = {
  id: string;
  unitType: UnitType;
  unitName: string;
  quantity: number;
  startedAt: string;
  finishesAt: string;
  remainingSeconds: number;
};

export type BarracksOverviewResponse = {
  cityId: string;
  cityName: string;
  barracksLevel: number;
  buildingType?: string;
  buildingName?: string;
  buildingLevel?: number;
  maxQuantityPerOrder: number;
  resources: CityResourcesResponse;
  trainingBonus?: {
    sourceBuildingType: string;
    sourceBuildingName: string;
    sourceBuildingLevel: number;
    costReductionPercent: number;
    timeReductionPercent: number;
  };
  units: UnitTrainingOption[];
  army: ArmyUnits;
  activeTraining: ActiveTrainingSummary | null;
};

export type TrainingOverviewResponse = BarracksOverviewResponse;

export type TrainUnitsRequest = {
  unitType: UnitType;
  quantity: number;
};

export type TrainUnitsResponse = {
  activeTraining: ActiveTrainingSummary;
  resources: CityResourcesResponse;
};

export type PveRewards = {
  wood: number;
  gold: number;
  marble: number;
  wine: number;
  crystal: number;
  sulfur: number;
};

export type PveCampSummary = {
  id: string;
  name: string;
  level: number;
  slotIndex: number;
  island: {
    id: string;
    name: string;
    x: number;
    y: number;
  };
  enemyStrength: number;
  strengthLabel: string;
  rewards: PveRewards;
  distanceFromSelectedCity: number;
  travelTimeSeconds: number;
};

export type PveCampListResponse = {
  selectedCity: {
    id: string;
    name: string;
  };
  camps: PveCampSummary[];
};

export type PveCampDetailResponse = {
  camp: PveCampSummary;
  originCity: {
    id: string;
    name: string;
  };
  army: ArmyUnits;
  units: UnitDefinitionSummary[];
  attack: {
    canAttack: boolean;
    disabledReason: string | null;
  };
};

export type PveBattleSummary = {
  victory: boolean;
  playerPower: number;
  campPower: number;
  unitsSent: ArmyUnits;
  unitsLost: ArmyUnits;
  unitsSurvived: ArmyUnits;
  rewards: PveRewards;
};

export type PvpBattleSummary = {
  attackerVictory: boolean;
  attackerPower: number;
  defenderPower: number;
  wallDefenseBonus: number;
  attackerUnitsSent: ArmyUnits;
  defenderUnitsParticipated: ArmyUnits;
  attackerUnitsLost: ArmyUnits;
  defenderUnitsLost: ArmyUnits;
  attackerUnitsSurvived: ArmyUnits;
  defenderUnitsSurvived: ArmyUnits;
  loot: ResourceBalance;
  protectedResources: ResourceBalance;
};

export type ArmyMovementSummary = {
  id: string;
  movementType: string;
  status: string;
  originCity: {
    id: string;
    name: string;
  };
  camp: {
    id: string;
    name: string;
    level: number;
  } | null;
  departureTime: string;
  arrivalTime: string;
  returnArrivalTime: string | null;
  remainingSeconds: number;
  units: ArmyUnits;
  battle: PveBattleSummary | null;
};

export type PvpAttackOptionsResponse = {
  originCity: {
    id: string;
    name: string;
  };
  targetCity: {
    id: string;
    name: string;
    playerName: string;
    beginnerProtectionActive: boolean;
  };
  army: ArmyUnits;
  units: UnitDefinitionSummary[];
  attack: {
    canAttack: boolean;
    disabledReason: string | null;
    cooldownEndsAt: string | null;
  };
};

export type PvpMovementSummary = {
  id: string;
  movementType: string;
  status: string;
  originCity: {
    id: string;
    name: string;
  };
  targetCity: {
    id: string;
    name: string;
    playerName: string;
  } | null;
  departureTime: string;
  arrivalTime: string;
  returnArrivalTime: string | null;
  remainingSeconds: number;
  units: ArmyUnits;
  loot: ResourceBalance;
  battle: PvpBattleSummary | null;
};

export type AttackPlayerCityRequest = {
  originCityId: string;
  units: ArmyUnits;
};

export type AttackPlayerCityResponse = {
  movement: PvpMovementSummary;
};

export type NavalShips = {
  light_ship: number;
  ram_ship: number;
  fire_ship: number;
};

export type NavalBattleSummary = {
  attackerVictory: boolean;
  attackerPower: number;
  defenderPower: number;
  portDefenseBonus: number;
  shipyardDefenseBonus: number;
  attackerShipsSent: NavalShips;
  defenderShipsParticipated: NavalShips;
  attackerShipsLost: NavalShips;
  defenderShipsLost: NavalShips;
  attackerShipsSurvived: NavalShips;
  defenderShipsSurvived: NavalShips;
  attackerLossRate: number;
  defenderLossRate: number;
};

export type NavalMovementSummary = {
  id: string;
  movementType: string;
  status: string;
  originCity: { id: string; name: string };
  targetCity: { id: string; name: string; playerName: string | null };
  ships: NavalShips;
  departureTime: string;
  arrivalTime: string;
  returnArrivalTime: string | null;
  remainingSeconds: number;
  battle: NavalBattleSummary | null;
  blockadeId: string | null;
};

export type NavalAttackOptionsResponse = {
  originCity: { id: string; name: string };
  targetCity: {
    id: string;
    name: string;
    playerName: string;
    beginnerProtectionActive: boolean;
    blockaded: boolean;
  };
  fleet: NavalShips;
  ships: UnitDefinitionSummary[];
  attack: {
    canAttack: boolean;
    disabledReason: string | null;
    cooldownEndsAt: string | null;
  };
};

export type NavalAttackRequest = {
  originCityId: string;
  ships: Partial<NavalShips>;
  establishBlockade?: boolean;
};

export type NavalAttackResponse = {
  movement: NavalMovementSummary;
};

export type CityBlockadeSummary = {
  id: string;
  status: string;
  attackerPlayerId: string;
  defenderPlayerId: string;
  originCityId: string;
  targetCityId: string;
  startedAt: string;
  endsAt: string;
  endedAt: string | null;
  committedShips: NavalShips;
  remainingSeconds: number;
};

export type AttackPveCampRequest = {
  originCityId: string;
  units: ArmyUnits;
};

export type AttackPveCampResponse = {
  movement: ArmyMovementSummary;
};

export type EconomyProgressionBlocker = {
  id: string;
  severity: 'info' | 'warning' | 'blocked';
  title: string;
  description: string;
  recommendation: string;
};

export type DebugEconomyBuilding = {
  type: string;
  name: string;
  level: number;
  status: string;
  upgradeCost: ResourceCost;
  upgradeDurationSeconds: number;
};

export type DebugEconomyResearch = {
  researchPoints: number;
  researchPointsPerHour: number;
  activeResearch: ActiveResearch | null;
};

export type DebugEconomyUnit = UnitDefinitionSummary & {
  owned: number;
};

export type DebugEconomyDashboardResponse = {
  player: {
    id: string;
    name: string;
    accountAgeHours: number;
  };
  city: CitySummary;
  resources: CityResourcesResponse;
  production: ResourceProduction;
  storage: StorageSummary;
  buildings: DebugEconomyBuilding[];
  research: DebugEconomyResearch;
  units: DebugEconomyUnit[];
  pveCampRewards: Array<{
    level: number;
    enemyStrength: number;
    victoryLossPercent: number;
    rewards: PveRewards;
  }>;
  claimedQuestRewards: QuestReward[];
  analytics: Array<{
    eventType: string;
    count: number;
  }>;
  estimatedNextMeaningfulAction: string;
  progressionBlockers: EconomyProgressionBlocker[];
};

export type DebugProgressionBlockersResponse = {
  blockers: EconomyProgressionBlocker[];
};

export type LiveEventType =
  | 'resource_bonus'
  | 'research_bonus'
  | 'pve_invasion'
  | 'alliance_donation';

export type LiveEventStatus = 'draft' | 'scheduled' | 'active' | 'ended' | 'cancelled';

export type LiveEventReward = Partial<ResourceBalance> & {
  researchPoints?: number;
};

export type LiveEventSummary = {
  id: string;
  type: LiveEventType;
  status: LiveEventStatus;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  announcement: string | null;
  bonusPercent: number | null;
  reward: LiveEventReward;
  participationAction: string;
  playerProgress: {
    joined: boolean;
    points: number;
    rewardClaimed: boolean;
    rank: number | null;
  };
};

export type LiveEventRankingRow = {
  rank: number;
  playerId: string;
  playerName: string;
  points: number;
  rewardClaimed: boolean;
};

export type LiveEventsResponse = {
  events: LiveEventSummary[];
};

export type LiveEventDetailResponse = {
  event: LiveEventSummary;
  rankings: LiveEventRankingRow[];
};

export type JoinLiveEventResponse = {
  event: LiveEventSummary;
};

export type RecordLiveEventParticipationRequest = {
  actionCount?: number;
};

export type ClaimLiveEventRewardResponse = {
  event: LiveEventSummary;
  reward: LiveEventReward;
};

export type LaunchLiveEventRequest = {
  type: LiveEventType;
  title?: string;
  description?: string;
  startsAt: string;
  endsAt: string;
  announcement?: string;
  bonusPercent?: number;
  reward?: LiveEventReward;
};

export type LiveEventAnalyticsSummary = {
  eventId: string;
  participants: number;
  totalPoints: number;
  rewardsClaimed: number;
};

export type AdminLiveEventsResponse = {
  events: Array<
    LiveEventSummary & {
      analytics: LiveEventAnalyticsSummary;
    }
  >;
};
