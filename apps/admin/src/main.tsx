import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';

type View =
  | 'overview'
  | 'beta'
  | 'players'
  | 'cities'
  | 'moderation'
  | 'resources'
  | 'trades'
  | 'battles'
  | 'naval'
  | 'scouting'
  | 'payments'
  | 'inventory'
  | 'donations'
  | 'suspicious'
  | 'anti-abuse'
  | 'logs';

type ApiState<T> = {
  data: T | null;
  isLoading: boolean;
  error: string | null;
};

type PlayerSummary = {
  id: string;
  name: string;
  score: number;
  createdAt: string;
  user: { email: string; displayName: string; accountStatus: string; emailVerified: boolean } | null;
  moderation: Record<string, unknown> | null;
  cities?: Array<{ id: string; name: string }>;
};

type CitySummary = {
  id: string;
  name: string;
  level: number;
  population: number;
  happiness: number;
  player: { id: string; name: string } | null;
  island: { name: string | null; x: number; y: number; luxuryResource: string } | null;
  resources: Record<string, number> | null;
};

type ResourceTransaction = {
  id: string;
  transactionType: string;
  resourceType: string;
  amount: number;
  balanceAfter: number;
  referenceType?: string | null;
  referenceId?: string | null;
  createdAt: string;
  player?: { id: string; name: string } | null;
  city?: { id: string; name: string } | null;
};

type BattleMovement = {
  id: string;
  movementType: string;
  status: string;
  departureTime: string;
  arrivalTime: string;
  returnArrivalTime?: string | null;
  completedAt?: string | null;
  payload?: Record<string, unknown> | null;
  player?: { id: string; name: string } | null;
  originCity?: { id: string; name: string } | null;
  destinationCity?: { id: string; name: string } | null;
  destinationCampId?: string | null;
};

type TradeAuditRow = {
  id: string;
  offerId: string;
  sellerPlayerId: string;
  buyerPlayerId: string;
  sellerCityId: string;
  buyerCityId: string;
  resourceFromSeller: string;
  amountFromSeller: number;
  resourceFromBuyer: string;
  amountFromBuyer: number;
  taxFromSellerSide?: number;
  taxFromBuyerSide?: number;
  movementId?: string | null;
  completedAt?: string | null;
  createdAt: string;
};

type SuspiciousTradeRow = {
  id: string;
  offerId?: string | null;
  playerId?: string | null;
  relatedPlayerId?: string | null;
  reason: string;
  severity: string;
  payload?: Record<string, unknown> | null;
  createdAt: string;
};

type NavalAttackRow = {
  id: string;
  attackerPlayerId: string;
  defenderPlayerId: string;
  originCityId: string;
  targetCityId: string;
  status: string;
  result?: string | null;
  sentLightShip?: number;
  sentRamShip?: number;
  sentFireShip?: number;
  lostLightShip?: number;
  lostRamShip?: number;
  lostFireShip?: number;
  returnedLightShip?: number;
  returnedRamShip?: number;
  returnedFireShip?: number;
  attackerPower?: number | null;
  defenderPower?: number | null;
  blockadeCreated?: boolean;
  blockadeId?: string | null;
  startedAt: string;
  resolvedAt?: string | null;
  completedAt?: string | null;
};

type CityBlockadeRow = {
  id: string;
  attackerPlayerId: string;
  defenderPlayerId: string;
  originCityId: string;
  targetCityId: string;
  navalAttackId?: string | null;
  status: string;
  startedAt: string;
  endsAt: string;
  endedAt?: string | null;
  committedLightShip?: number;
  committedRamShip?: number;
  committedFireShip?: number;
};

type SpyMissionRow = {
  id: string;
  missionType: string;
  status: string;
  successChance: number;
  detectionChance: number;
  wasSuccessful?: boolean | null;
  wasDetected?: boolean | null;
  spyLost?: boolean | null;
  startedAt: string;
  resolvedAt?: string | null;
  completedAt?: string | null;
  attackerPlayer?: { id: string; name: string } | null;
  targetPlayer?: { id: string; name: string } | null;
  originCity?: { id: string; name: string } | null;
  targetCity?: { id: string; name: string } | null;
};

type ActivityRow = {
  id: string;
  playerId?: string | null;
  eventType?: string;
  actionType?: string;
  signalType?: string;
  severity?: string;
  status?: string;
  score?: number;
  reason?: string;
  title?: string | null;
  payload?: Record<string, unknown> | null;
  createdAt: string;
};

type AdminLogRow = {
  id: string;
  actionType: string;
  targetType?: string | null;
  targetId?: string | null;
  playerId?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  admin?: { id: string; email: string; displayName: string } | null;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';

const VIEWS: Array<{ id: View; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'beta', label: 'Beta' },
  { id: 'players', label: 'Players' },
  { id: 'cities', label: 'Cities' },
  { id: 'moderation', label: 'Reports' },
  { id: 'resources', label: 'Resources' },
  { id: 'trades', label: 'Trades' },
  { id: 'battles', label: 'Battles' },
  { id: 'naval', label: 'Naval' },
  { id: 'scouting', label: 'Scouting' },
  { id: 'payments', label: 'Payments' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'donations', label: 'Donations' },
  { id: 'suspicious', label: 'Suspicious' },
  { id: 'anti-abuse', label: 'Anti-Abuse' },
  { id: 'logs', label: 'Action Logs' },
];

function AdminApp() {
  const [view, setView] = useState<View>('overview');
  const [session, setSession] = useState<ApiState<any>>({ data: null, isLoading: true, error: null });
  const [payload, setPayload] = useState<ApiState<any>>({ data: null, isLoading: false, error: null });
  const [query, setQuery] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
      ...init,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.message ?? `API returned ${response.status}`);
    }
    return response.json() as Promise<T>;
  }

  async function loadSession() {
    setSession({ data: null, isLoading: true, error: null });
    try {
      setSession({ data: await request('/admin/me'), isLoading: false, error: null });
    } catch (error) {
      setSession({
        data: null,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Admin login required.',
      });
    }
  }

  const endpoint = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    params.set('limit', '50');
    const suffix = params.toString() ? `?${params.toString()}` : '';
    const endpoints: Record<View, string> = {
      overview: '/admin/overview',
      beta: '/admin/beta/overview',
      players: `/admin/players${suffix}`,
      cities: `/admin/cities${suffix}`,
      moderation: `/admin/moderation/messages${suffix}`,
      resources: '/admin/audits/resources?limit=50',
      trades: '/admin/audits/trades?limit=50',
      battles: '/admin/audits/battles?limit=50',
      naval: '/admin/audits/naval?limit=50',
      scouting: '/admin/audits/scouting?limit=50',
      payments: `/admin/audits/payments${suffix}`,
      inventory: '/admin/inventory/transactions?pageSize=50',
      donations: '/admin/donations?pageSize=50',
      suspicious: '/admin/suspicious-activity?limit=50',
      'anti-abuse': '/admin/anti-abuse/dashboard',
      logs: `/admin/action-logs${suffix}`,
    };
    return endpoints[view];
  }, [query, view]);

  async function loadView() {
    if (!session.data) return;
    setPayload({ data: null, isLoading: true, error: null });
    try {
      setPayload({ data: await request(endpoint), isLoading: false, error: null });
    } catch (error) {
      setPayload({
        data: null,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Could not load admin data.',
      });
    }
  }

  useEffect(() => {
    void loadSession();
  }, []);

  useEffect(() => {
    void loadView();
  }, [endpoint, session.data]);

  if (session.isLoading) {
    return <main className="admin-shell"><p className="muted">Checking admin session...</p></main>;
  }

  if (!session.data) {
    return <LoginScreen error={session.error} request={request} onLogin={() => void loadSession()} />;
  }

  return (
    <main className="admin-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Island Empires</p>
          <h1>Admin</h1>
          <p className="session-line">
            {session.data.user.displayName} · {session.data.user.role}
          </p>
        </div>
        <nav>
          {VIEWS.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? 'nav-button active' : 'nav-button'}
              type="button"
              onClick={() => {
                setView(item.id);
                setSelectedPlayerId(null);
                setSelectedCityId(null);
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <section className="workspace">
        <header className="toolbar">
          <div>
            <p className="eyebrow">{view}</p>
            <h2>{VIEWS.find((item) => item.id === view)?.label}</h2>
          </div>
          <div className="toolbar-actions">
            {['players', 'cities', 'moderation', 'payments', 'logs'].includes(view) ? (
              <input
                className="search-input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search"
              />
            ) : null}
            <button className="ghost-button" type="button" onClick={() => void loadView()}>
              Refresh
            </button>
          </div>
        </header>

        {payload.error ? <p className="error-banner">{payload.error}</p> : null}
        {payload.isLoading ? <p className="muted">Loading...</p> : null}
        {!payload.isLoading && payload.data ? (
          <AdminView
            view={view}
            data={payload.data}
            selectedPlayerId={selectedPlayerId}
            selectedCityId={selectedCityId}
            setSelectedPlayerId={setSelectedPlayerId}
            setSelectedCityId={setSelectedCityId}
            request={request}
            reload={() => void loadView()}
          />
        ) : null}
      </section>
    </main>
  );
}

function LoginScreen(props: {
  error: string | null;
  request: <T>(path: string, init?: RequestInit) => Promise<T>;
  onLogin: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(props.error);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await props.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      props.onLogin();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Login failed.');
    }
  }

  return (
    <main className="login-shell">
      <form className="login-panel" onSubmit={(event) => void submit(event)}>
        <p className="eyebrow">Secure access</p>
        <h1>Admin Login</h1>
        {error ? <p className="error-banner">{error}</p> : null}
        <label>
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
        </label>
        <label>
          Password
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required />
        </label>
        <button className="primary-button" type="submit">Sign in</button>
      </form>
    </main>
  );
}

function AdminView(props: {
  view: View;
  data: any;
  selectedPlayerId: string | null;
  selectedCityId: string | null;
  setSelectedPlayerId: (id: string | null) => void;
  setSelectedCityId: (id: string | null) => void;
  request: <T>(path: string, init?: RequestInit) => Promise<T>;
  reload: () => void;
}) {
  if (props.view === 'overview') return <Overview data={props.data} />;
  if (props.view === 'beta') return <BetaView data={props.data} request={props.request} reload={props.reload} />;
  if (props.view === 'players') {
    return (
      <PlayersView
        players={props.data.players ?? []}
        selectedPlayerId={props.selectedPlayerId}
        setSelectedPlayerId={props.setSelectedPlayerId}
        request={props.request}
        reload={props.reload}
      />
    );
  }
  if (props.view === 'cities') {
    return (
      <CitiesView
        cities={props.data.cities ?? []}
        selectedCityId={props.selectedCityId}
        setSelectedCityId={props.setSelectedCityId}
        request={props.request}
      />
    );
  }
  if (props.view === 'moderation') return <ModerationView data={props.data} request={props.request} reload={props.reload} />;
  if (props.view === 'resources') return <ResourcesView transactions={props.data.transactions ?? []} />;
  if (props.view === 'trades') return <TradesView trades={props.data.trades ?? []} suspicious={props.data.suspicious ?? []} />;
  if (props.view === 'battles') return <BattlesView battles={props.data.battles ?? []} />;
  if (props.view === 'naval') return <NavalView attacks={props.data.navalAttacks ?? []} blockades={props.data.blockades ?? []} />;
  if (props.view === 'scouting') return <ScoutingView missions={props.data.spyMissions ?? []} />;
  if (props.view === 'suspicious') return <SuspiciousView data={props.data} />;
  if (props.view === 'payments') return <PaymentsView data={props.data} request={props.request} reload={props.reload} />;
  if (props.view === 'inventory') return <InventoryAuditView data={props.data} request={props.request} reload={props.reload} />;
  if (props.view === 'donations') return <DonationAuditView data={props.data} request={props.request} reload={props.reload} />;
  if (props.view === 'anti-abuse') return <AntiAbuseView data={props.data} request={props.request} reload={props.reload} />;
  if (props.view === 'logs') return <ActionLogsView logs={props.data.logs ?? []} />;
  return <JsonTable data={props.data} />;
}

function BetaView(props: {
  data: any;
  request: <T>(path: string, init?: RequestInit) => Promise<T>;
  reload: () => void;
}) {
  const [metrics, setMetrics] = useState<any>(null);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [allowlist, setAllowlist] = useState<any[]>([]);
  const [inviteCode, setInviteCode] = useState('');
  const [allowlistEmail, setAllowlistEmail] = useState('');
  const [cohort, setCohort] = useState('early_strategy_players');
  const [maxUses, setMaxUses] = useState(25);
  const [error, setError] = useState<string | null>(null);

  async function loadBetaDetails() {
    setError(null);
    try {
      const [metricPayload, feedbackPayload, invitePayload, allowlistPayload] = await Promise.all([
        props.request<any>('/admin/beta/metrics'),
        props.request<any>('/admin/beta/feedback?status=open&pageSize=25'),
        props.request<any>('/admin/beta/invites'),
        props.request<any>('/admin/beta/allowlist'),
      ]);
      setMetrics(metricPayload);
      setFeedback(feedbackPayload.feedback ?? []);
      setInvites(invitePayload.invites ?? []);
      setAllowlist(allowlistPayload.allowlist ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load beta details.');
    }
  }

  useEffect(() => {
    void loadBetaDetails();
  }, []);

  async function createInvite(event: FormEvent) {
    event.preventDefault();
    if (!inviteCode.trim()) return;
    await props.request('/admin/beta/invites', {
      method: 'POST',
      body: JSON.stringify({ code: inviteCode, cohort, maxUses }),
    });
    setInviteCode('');
    await loadBetaDetails();
  }

  async function createAllowlistEntry(event: FormEvent) {
    event.preventDefault();
    if (!allowlistEmail.trim()) return;
    await props.request('/admin/beta/allowlist', {
      method: 'POST',
      body: JSON.stringify({ email: allowlistEmail, cohort }),
    });
    setAllowlistEmail('');
    await loadBetaDetails();
  }

  async function updateFeedback(feedbackId: string, status: string) {
    await props.request(`/admin/beta/feedback/${feedbackId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, adminNote: `Marked ${status}` }),
    });
    await loadBetaDetails();
    props.reload();
  }

  const overviewCards = [
    ['Registrations', props.data.registrations?.total ?? 0],
    ['Today', props.data.registrations?.today ?? 0],
    ['Tutorial', `${Math.round((props.data.tutorial?.completionRate ?? 0) * 100)}%`],
    ['D1 Retention', `${Math.round((props.data.retention?.d1 ?? 0) * 100)}%`],
    ['Open Feedback', props.data.feedback?.open ?? 0],
    ['Bugs', props.data.feedback?.bugs ?? 0],
  ];

  return (
    <div className="overview-grid">
      {overviewCards.map(([label, value]) => (
        <article className="metric-card" key={label}>
          <span>{label}</span>
          <strong>{String(value)}</strong>
        </article>
      ))}
      {error ? <p className="error-banner wide">{error}</p> : null}
      <section className="panel wide">
        <div className="toolbar">
          <div>
            <p className="eyebrow">Beta Health</p>
            <h3>{props.data.world?.name ?? 'Beta World'}</h3>
          </div>
          <button className="ghost-button" type="button" onClick={() => void loadBetaDetails()}>Refresh Beta</button>
        </div>
        {metrics ? (
          <div className="resource-row">
            <span>Reports: {metrics.health?.openReports ?? 0}</span>
            <span>Abuse flags: {metrics.health?.openAbuseFlags ?? 0}</span>
            <span>PvE attacks 24h: {metrics.combat?.pveAttacks ?? 0}</span>
            <span>PvP attacks 24h: {metrics.combat?.pvpAttacks ?? 0}</span>
            <span>Offers 24h: {metrics.marketplace?.offersCreated ?? 0}</span>
            <span>Alliances 24h: {metrics.alliances?.created ?? 0}</span>
          </div>
        ) : <p className="muted">Loading beta metrics...</p>}
      </section>
      <section className="panel wide">
        <h3>Invite Codes</h3>
        <form className="inline-form" onSubmit={(event) => void createInvite(event)}>
          <input value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} placeholder="BETA-1234" />
          <input value={cohort} onChange={(event) => setCohort(event.target.value)} placeholder="cohort" />
          <input value={maxUses} onChange={(event) => setMaxUses(Number(event.target.value))} min={1} max={10000} type="number" />
          <button className="primary-button" type="submit">Create Invite</button>
        </form>
        <div className="compact-list">
          {invites.map((invite) => (
            <span key={invite.id}>
              {invite.code} · {invite.status} · {invite.usedCount}/{invite.maxUses} · {invite.cohort ?? 'no cohort'}
            </span>
          ))}
        </div>
      </section>
      <section className="panel wide">
        <h3>Email Allowlist</h3>
        <form className="inline-form allowlist-form" onSubmit={(event) => void createAllowlistEntry(event)}>
          <input value={allowlistEmail} onChange={(event) => setAllowlistEmail(event.target.value)} placeholder="player@example.com" type="email" />
          <input value={cohort} onChange={(event) => setCohort(event.target.value)} placeholder="cohort" />
          <button className="primary-button" type="submit">Allow Email</button>
        </form>
        <div className="compact-list">
          {allowlist.map((entry) => (
            <span key={entry.id}>
              {entry.email} · {entry.status} · {entry.cohort ?? 'no cohort'}
            </span>
          ))}
        </div>
      </section>
      <section className="panel wide">
        <h3>Feedback Queue</h3>
        <div className="table-panel">
          {feedback.map((item) => (
            <article className="table-row json-row" key={item.id}>
              <strong>{item.category} · {item.title}</strong>
              <span>{item.player?.name ?? item.user?.email ?? 'Unknown player'} · {item.page ?? 'no page'}</span>
              <p>{item.message}</p>
              <div className="actions">
                <button className="ghost-button compact-button" type="button" onClick={() => void updateFeedback(item.id, 'reviewing')}>Reviewing</button>
                <button className="primary-button compact-button" type="button" onClick={() => void updateFeedback(item.id, 'planned')}>Planned</button>
                <button className="primary-button compact-button" type="button" onClick={() => void updateFeedback(item.id, 'fixed')}>Fixed</button>
                <button className="ghost-button compact-button" type="button" onClick={() => void updateFeedback(item.id, 'dismissed')}>Dismiss</button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function PaymentsView(props: {
  data: any;
  request: <T>(path: string, init?: RequestInit) => Promise<T>;
  reload: () => void;
}) {
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [reason, setReason] = useState('Customer support refund');
  const payments = props.data.payments ?? [];

  useEffect(() => {
    if (!selectedPurchaseId) {
      setDetail(null);
      return;
    }
    void props.request(`/admin/audits/payments/${selectedPurchaseId}`).then(setDetail);
  }, [selectedPurchaseId]);

  async function recordRefund() {
    if (!selectedPurchaseId || !window.confirm('Record refund for this purchase?')) return;
    await props.request(`/admin/audits/payments/${selectedPurchaseId}/refund-record`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    props.reload();
    setDetail(await props.request(`/admin/audits/payments/${selectedPurchaseId}`));
  }

  return (
    <div className="split-grid">
      <div className="panel list-panel">
        {payments.map((payment: any) => (
          <button className="list-row" key={payment.id} type="button" onClick={() => setSelectedPurchaseId(payment.id)}>
            <strong>{payment.productName}</strong>
            <span>{payment.userEmail ?? 'No email'} · {payment.playerName ?? 'No player'}</span>
            <span>{payment.status} · {payment.provider}</span>
          </button>
        ))}
      </div>
      <section className="panel detail-panel">
        {!detail ? <p className="muted">Select a purchase.</p> : (
          <>
            <h3>{detail.purchase.itemName}</h3>
            <p className="muted">{detail.user?.email} · {detail.player?.name}</p>
            <JsonTable data={{
              purchase: detail.purchase,
              ledgerEntries: detail.ledgerEntries,
              refunds: detail.refunds,
              auditLogs: detail.auditLogs,
              abuseSignals: detail.abuseSignals,
            }} />
            <label>
              Refund reason
              <input value={reason} onChange={(event) => setReason(event.target.value)} />
            </label>
            <button className="danger-button" type="button" onClick={() => void recordRefund()}>
              Record Refund
            </button>
          </>
        )}
      </section>
    </div>
  );
}

function InventoryAuditView(props: {
  data: any;
  request: <T>(path: string, init?: RequestInit) => Promise<T>;
  reload: () => void;
}) {
  const [playerId, setPlayerId] = useState('');
  const [itemId, setItemId] = useState('resource_pack_wood_small');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('Beta participation reward');
  const [error, setError] = useState<string | null>(null);
  const transactions = props.data.transactions ?? [];

  async function grant(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await props.request('/admin/inventory/grant', {
        method: 'POST',
        body: JSON.stringify({ playerId, itemId, quantity, reason }),
      });
      props.reload();
    } catch (grantError) {
      setError(grantError instanceof Error ? grantError.message : 'Grant failed.');
    }
  }

  return (
    <div className="split-grid">
      <div className="panel list-panel">
        {transactions.map((row: any) => (
          <div className="list-row" key={row.id}>
            <strong>{row.definition?.name ?? row.itemId}</strong>
            <span>{row.transactionType} · qty {row.quantity} · balance {row.balanceAfter ?? '-'}</span>
            <span>{row.player?.name ?? row.playerId ?? 'No player'} · {formatDateTime(row.createdAt)}</span>
          </div>
        ))}
      </div>
      <section className="panel detail-panel">
        <h3>Admin Grant</h3>
        {error ? <p className="error-banner">{error}</p> : null}
        <form className="stacked-form" onSubmit={(event) => void grant(event)}>
          <label>
            Player ID
            <input value={playerId} onChange={(event) => setPlayerId(event.target.value)} required />
          </label>
          <label>
            Item ID
            <input value={itemId} onChange={(event) => setItemId(event.target.value)} required />
          </label>
          <label>
            Quantity
            <input type="number" min={1} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} required />
          </label>
          <label>
            Reason
            <input value={reason} onChange={(event) => setReason(event.target.value)} required />
          </label>
          <button className="primary-button" type="submit">Grant Item</button>
        </form>
      </section>
    </div>
  );
}

function DonationAuditView(props: {
  data: any;
  request: <T>(path: string, init?: RequestInit) => Promise<T>;
  reload: () => void;
}) {
  const [selectedDonationId, setSelectedDonationId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [reason, setReason] = useState('Customer support refund');
  const donations = props.data.donations ?? [];

  useEffect(() => {
    if (!selectedDonationId) {
      setDetail(null);
      return;
    }
    void props.request(`/admin/donations/${selectedDonationId}`).then(setDetail);
  }, [selectedDonationId]);

  async function recordRefund() {
    if (!selectedDonationId || !window.confirm('Record refund for this donation?')) return;
    await props.request(`/admin/donations/${selectedDonationId}/refund-record`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    props.reload();
    setDetail(await props.request(`/admin/donations/${selectedDonationId}`));
  }

  return (
    <div className="split-grid">
      <div className="panel list-panel">
        {donations.map((donation: any) => (
          <button className="list-row" key={donation.id} type="button" onClick={() => setSelectedDonationId(donation.id)}>
            <strong>{donation.supporterPackName}</strong>
            <span>{donation.user?.email ?? 'No email'} · {donation.player?.name ?? 'No player'}</span>
            <span>{donation.status} · {(donation.amountCents / 100).toFixed(2)} {donation.currency}</span>
          </button>
        ))}
      </div>
      <section className="panel detail-panel">
        {!detail ? <p className="muted">Select a donation.</p> : (
          <>
            <div className="detail-heading">
              <div>
                <p className="eyebrow">Donation Detail</p>
                <h3>{detail.donation.supporterPackName}</h3>
                <p className="muted">
                  {detail.donation.user?.email ?? 'No email'} · {detail.donation.player?.name ?? 'No player'}
                </p>
              </div>
              <StatusPill label={detail.donation.status} />
            </div>

            <div className="detail-summary-grid">
              <SummaryTile label="Amount" value={`${(detail.donation.amountCents / 100).toFixed(2)} ${detail.donation.currency}`} />
              <SummaryTile label="Provider" value={detail.donation.provider ?? 'Unknown'} />
              <SummaryTile label="Receipt" value={detail.donation.receiptSentAt ? 'Sent' : 'Not sent'} />
              <SummaryTile label="Created" value={formatDateTime(detail.donation.createdAt)} />
              <SummaryTile label="Fulfilled" value={detail.donation.fulfilledAt ? formatDateTime(detail.donation.fulfilledAt) : 'Not fulfilled'} />
              <SummaryTile label="Refunded" value={detail.donation.refundedAt ? formatDateTime(detail.donation.refundedAt) : 'No refund'} />
            </div>

            <section className="detail-section">
              <h4>Supporter Items</h4>
              <div className="compact-list">
                {(detail.donation.items ?? []).map((item: any) => (
                  <span key={item.itemId}>{item.quantity}x {item.name}</span>
                ))}
              </div>
            </section>

            <section className="detail-section">
              <h4>Provider Reference</h4>
              <div className="key-value-grid">
                <span>Donation ID</span><code>{detail.donation.id}</code>
                <span>Session ID</span><code>{detail.donation.providerSessionId ?? 'none'}</code>
              </div>
            </section>

            <section className="detail-section">
              <h4>Audit Logs</h4>
              {(detail.auditLogs ?? []).length === 0 ? <p className="muted">No audit logs.</p> : (
                <div className="timeline-list">
                  {detail.auditLogs.map((log: any) => (
                    <article key={log.id} className="timeline-row">
                      <div>
                        <strong>{labelize(log.actionType)}</strong>
                        <span>{formatDateTime(log.createdAt)} · {log.statusBefore ?? 'none'} → {log.statusAfter ?? 'none'}</span>
                      </div>
                      <small>{log.provider ?? 'system'}</small>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="detail-section">
              <h4>Refunds</h4>
              {(detail.refunds ?? []).length === 0 ? <p className="muted">No refunds recorded.</p> : (
                <div className="timeline-list">
                  {detail.refunds.map((refund: any) => (
                    <article key={refund.id} className="timeline-row">
                      <div>
                        <strong>{refund.status}</strong>
                        <span>{(refund.amountCents / 100).toFixed(2)} {refund.currency} · {refund.reason ?? 'No reason'}</span>
                      </div>
                      <small>{formatDateTime(refund.createdAt)}</small>
                    </article>
                  ))}
                </div>
              )}
            </section>
            <label>
              Refund reason
              <input value={reason} onChange={(event) => setReason(event.target.value)} />
            </label>
            <button className="danger-button" type="button" onClick={() => void recordRefund()}>
              Record Refund
            </button>
          </>
        )}
      </section>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <article className="summary-tile">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function StatusPill({ label }: { label: string }) {
  return <span className={`status-pill ${label}`}>{labelize(label)}</span>;
}

function Overview({ data }: { data: any }) {
  return (
    <div className="overview-grid">
      {Object.entries(data.counts ?? {}).map(([key, value]) => (
        <article className="metric-card" key={key}>
          <span>{labelize(key)}</span>
          <strong>{String(value)}</strong>
        </article>
      ))}
      <section className="panel wide">
        <h3>World Resources</h3>
        <div className="resource-row">
          {Object.entries(data.resources ?? {}).map(([key, value]) => (
            <span key={key}>{key}: {String(value ?? 0)}</span>
          ))}
        </div>
      </section>
    </div>
  );
}

function PlayersView(props: {
  players: PlayerSummary[];
  selectedPlayerId: string | null;
  setSelectedPlayerId: (id: string | null) => void;
  request: <T>(path: string, init?: RequestInit) => Promise<T>;
  reload: () => void;
}) {
  return (
    <div className="split-grid">
      <div className="panel list-panel">
        {props.players.map((player) => (
          <button
            className="list-row"
            key={player.id}
            type="button"
            onClick={() => props.setSelectedPlayerId(player.id)}
          >
            <strong>{player.name}</strong>
            <span>{player.user?.email ?? 'No email'} · score {player.score}</span>
            <Status moderation={player.moderation} />
          </button>
        ))}
      </div>
      <PlayerDetail
        playerId={props.selectedPlayerId}
        request={props.request}
        reloadList={props.reload}
      />
    </div>
  );
}

function PlayerDetail(props: {
  playerId: string | null;
  request: <T>(path: string, init?: RequestInit) => Promise<T>;
  reloadList: () => void;
}) {
  const [detail, setDetail] = useState<any>(null);
  const [reason, setReason] = useState('Operator review');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!props.playerId) return;
    setError(null);
    try {
      setDetail(await props.request(`/admin/players/${props.playerId}`));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load player.');
    }
  }

  useEffect(() => {
    setDetail(null);
    void load();
  }, [props.playerId]);

  async function act(action: string, extra: Record<string, unknown> = {}) {
    if (!props.playerId) return;
    if (!window.confirm(`Confirm ${action} for this player?`)) return;
    setError(null);
    try {
      await props.request(`/admin/players/${props.playerId}/${action}`, {
        method: 'POST',
        body: JSON.stringify({ reason, ...extra }),
      });
      await load();
      props.reloadList();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Action failed.');
    }
  }

  async function addNote() {
    if (!props.playerId || !note.trim()) return;
    await props.request(`/admin/players/${props.playerId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ body: note }),
    });
    setNote('');
    await load();
  }

  async function revokeAction(actionId: string) {
    if (!window.confirm('Revoke this moderation action?')) return;
    setError(null);
    try {
      await props.request(`/admin/moderation/actions/${actionId}/revoke`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      await load();
      props.reloadList();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Revoke failed.');
    }
  }

  if (!props.playerId) return <section className="panel detail-panel"><p className="muted">Select a player.</p></section>;
  if (!detail) return <section className="panel detail-panel"><p className="muted">Loading player...</p></section>;

  const player = detail.player;
  return (
    <section className="panel detail-panel">
      <h3>{player.name}</h3>
      <p className="muted">{player.user?.email} · {player.user?.accountStatus}</p>
      <Status moderation={player.moderation} />
      {error ? <p className="error-banner">{error}</p> : null}
      <label>
        Action reason
        <input value={reason} onChange={(event) => setReason(event.target.value)} />
      </label>
      <div className="button-grid">
        <button className="ghost-button" type="button" onClick={() => void act('warn')}>Warn</button>
        <button className="ghost-button" type="button" onClick={() => void act('mute', { durationDays: 1 })}>Mute 1d</button>
        <button className="ghost-button" type="button" onClick={() => void act('unmute')}>Unmute</button>
        <button className="danger-button" type="button" onClick={() => void act('suspend', { durationDays: 7 })}>Suspend 7d</button>
        <button className="ghost-button" type="button" onClick={() => void act('unsuspend')}>Unsuspend</button>
        <button className="danger-button" type="button" onClick={() => void act('ban')}>Ban</button>
        <button className="ghost-button" type="button" onClick={() => void act('unban')}>Unban</button>
      </div>
      <label>
        Admin note
        <textarea value={note} onChange={(event) => setNote(event.target.value)} />
      </label>
      <button className="primary-button" type="button" onClick={() => void addNote()}>Add Note</button>
      <h4>Cities</h4>
      <div className="compact-list">
        {player.cities.map((city: CitySummary) => <span key={city.id}>{city.name} · level {city.level}</span>)}
      </div>
      <h4>Notes</h4>
      <div className="compact-list">
        {player.notes.map((item: any) => <span key={item.id}>{item.body}</span>)}
      </div>
      <h4>Warnings</h4>
      <div className="compact-list">
        {player.warnings.map((item: any) => <span key={item.id}>{item.reason}</span>)}
      </div>
      <h4>Moderation History</h4>
      <div className="compact-list">
        {(player.moderationActions ?? []).map((item: any) => (
          <span className="history-row" key={item.id}>
            <strong>{item.actionType}</strong>
            <small>{item.status} · {item.reason}</small>
            {item.status === 'active' ? (
              <button className="ghost-button compact-button" type="button" onClick={() => void revokeAction(item.id)}>
                Revoke
              </button>
            ) : null}
          </span>
        ))}
      </div>
    </section>
  );
}

function CitiesView(props: {
  cities: CitySummary[];
  selectedCityId: string | null;
  setSelectedCityId: (id: string | null) => void;
  request: <T>(path: string, init?: RequestInit) => Promise<T>;
}) {
  return (
    <div className="split-grid">
      <div className="table-panel">
        {props.cities.map((city) => (
          <button className="table-row button-row" key={city.id} type="button" onClick={() => props.setSelectedCityId(city.id)}>
            <strong>{city.name}</strong>
            <span>{city.player?.name ?? 'No player'}</span>
            <span>Level {city.level}</span>
            <span>Pop {city.population}</span>
            <span>{city.island ? `${city.island.x}:${city.island.y}` : 'No island'}</span>
          </button>
        ))}
      </div>
      <CityDetail cityId={props.selectedCityId} request={props.request} />
    </div>
  );
}

function CityDetail(props: {
  cityId: string | null;
  request: <T>(path: string, init?: RequestInit) => Promise<T>;
}) {
  const [detail, setDetail] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!props.cityId) return;
      setError(null);
      setDetail(null);
      try {
        setDetail(await props.request(`/admin/cities/${props.cityId}`));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Could not load city.');
      }
    }
    void load();
  }, [props.cityId]);

  if (!props.cityId) return <section className="panel detail-panel"><p className="muted">Select a city.</p></section>;
  if (error) return <section className="panel detail-panel"><p className="error-banner">{error}</p></section>;
  if (!detail) return <section className="panel detail-panel"><p className="muted">Loading city...</p></section>;

  const city = detail.city;
  return (
    <section className="panel detail-panel">
      <h3>{city.name}</h3>
      <p className="muted">
        {city.player?.name ?? 'No owner'} · level {city.level} · pop {city.population}
      </p>
      <h4>Resources</h4>
      <div className="resource-row">
        {Object.entries(city.resources ?? {}).map(([key, value]) => (
          <span key={key}>{key}: {String(value)}</span>
        ))}
      </div>
      <h4>Buildings</h4>
      <div className="compact-list">
        {(detail.buildings ?? []).map((building: any) => (
          <span key={building.id}>{building.buildingType} · level {building.level} · {building.status}</span>
        ))}
      </div>
      <h4>Units</h4>
      <div className="compact-list">
        {(detail.units ?? []).map((unit: any) => (
          <span key={unit.id}>{unit.unitType}: {unit.quantity}</span>
        ))}
      </div>
      <h4>Fleet and Spies</h4>
      <code>{JSON.stringify({ fleet: detail.fleet, spyState: detail.spyState })}</code>
    </section>
  );
}

function ModerationView(props: {
  data: any;
  request: <T>(path: string, init?: RequestInit) => Promise<T>;
  reload: () => void;
}) {
  async function review(reportId: string, status: 'resolved' | 'dismissed') {
    await props.request(`/admin/moderation/messages/${reportId}/review`, {
      method: 'POST',
      body: JSON.stringify({ status, reason: `Marked ${status}` }),
    });
    props.reload();
  }

  return (
    <div className="table-panel">
      {(props.data.reports ?? []).map((report: any) => (
        <article className="report-row" key={report.id}>
          <div>
            <span className="status-pill">{report.status}</span>
            <h3>{report.message.subject}</h3>
            <p>{report.message.body}</p>
            <small>Reported by {report.reporter.name}: {report.reason}</small>
          </div>
          <div className="actions">
            <button className="ghost-button" type="button" onClick={() => void review(report.id, 'dismissed')}>Dismiss</button>
            <button className="primary-button" type="button" onClick={() => void review(report.id, 'resolved')}>Resolve</button>
          </div>
        </article>
      ))}
    </div>
  );
}

function ResourcesView({ transactions }: { transactions: ResourceTransaction[] }) {
  if (transactions.length === 0) {
    return <section className="panel empty-panel"><p className="muted">No resource transactions found.</p></section>;
  }

  return (
    <div className="table-panel resource-audit-table">
      <div className="resource-audit-header">
        <span>Time</span>
        <span>Player / City</span>
        <span>Change</span>
        <span>Balance</span>
        <span>Reference</span>
      </div>
      {transactions.map((transaction) => (
        <article className="resource-audit-row" key={transaction.id}>
          <div>
            <strong>{formatDateTime(transaction.createdAt)}</strong>
            <small>{shortId(transaction.id)}</small>
          </div>
          <div>
            <strong>{transaction.player?.name ?? 'Unknown player'}</strong>
            <small>{transaction.city?.name ?? 'Unknown city'}</small>
          </div>
          <div>
            <span className={transaction.amount >= 0 ? 'resource-delta positive' : 'resource-delta negative'}>
              {formatSignedNumber(transaction.amount)} {labelize(transaction.resourceType)}
            </span>
            <small>{labelize(transaction.transactionType)}</small>
          </div>
          <strong>{formatNumber(transaction.balanceAfter)}</strong>
          <div>
            <span>{transaction.referenceType ? labelize(transaction.referenceType) : 'Manual / system'}</span>
            <small>{transaction.referenceId ? shortId(transaction.referenceId) : 'No reference ID'}</small>
          </div>
        </article>
      ))}
    </div>
  );
}

function BattlesView({ battles }: { battles: BattleMovement[] }) {
  if (battles.length === 0) {
    return <section className="panel empty-panel"><p className="muted">No battle movements found.</p></section>;
  }

  return (
    <div className="table-panel battle-audit-table">
      <div className="battle-audit-header">
        <span>Battle</span>
        <span>Player</span>
        <span>Route</span>
        <span>Timing</span>
        <span>Payload</span>
      </div>
      {battles.map((battle) => (
        <article className="battle-audit-row" key={battle.id}>
          <div>
            <strong>{labelize(battle.movementType)}</strong>
            <span className={`status-pill ${battle.status}`}>{labelize(battle.status)}</span>
            <small>{shortId(battle.id)}</small>
          </div>
          <div>
            <strong>{battle.player?.name ?? 'Unknown player'}</strong>
            <small>{battle.player?.id ? shortId(battle.player.id) : 'No player ID'}</small>
          </div>
          <div>
            <strong>
              {battle.originCity?.name ?? 'Unknown origin'} {' -> '}{battle.destinationCity?.name ?? getBattleDestinationLabel(battle)}
            </strong>
            <small>{getBattleTargetLabel(battle)}</small>
          </div>
          <div>
            <strong>{formatDateTime(battle.departureTime)} {' -> '}{formatDateTime(battle.arrivalTime)}</strong>
            <small>{battle.completedAt ? `Completed ${formatDateTime(battle.completedAt)}` : getReturnTimeLabel(battle)}</small>
          </div>
          <div className="payload-summary">
            {summarizeBattlePayload(battle.payload).map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

function TradesView({ trades, suspicious }: { trades: TradeAuditRow[]; suspicious: SuspiciousTradeRow[] }) {
  return (
    <div className="audit-stack">
      <section className="table-panel">
        <AuditTitle title="Completed Trades" count={trades.length} />
        {trades.length === 0 ? <EmptyAudit message="No completed trades found." /> : null}
        {trades.map((trade) => (
          <article className="audit-row five-col" key={trade.id}>
            <div>
              <strong>{formatDateTime(trade.completedAt ?? trade.createdAt)}</strong>
              <small>Trade {shortId(trade.id)}</small>
            </div>
            <div>
              <strong>Seller {shortId(trade.sellerPlayerId)}</strong>
              <small>City {shortId(trade.sellerCityId)}</small>
            </div>
            <div>
              <strong>Buyer {shortId(trade.buyerPlayerId)}</strong>
              <small>City {shortId(trade.buyerCityId)}</small>
            </div>
            <div>
              <span className="payload-chip">{formatNumber(trade.amountFromSeller)} {labelize(trade.resourceFromSeller)}</span>
              <span className="payload-chip">{formatNumber(trade.amountFromBuyer)} {labelize(trade.resourceFromBuyer)}</span>
            </div>
            <div>
              <strong>Tax {formatNumber((trade.taxFromSellerSide ?? 0) + (trade.taxFromBuyerSide ?? 0))}</strong>
              <small>Offer {shortId(trade.offerId)}</small>
            </div>
          </article>
        ))}
      </section>
      <section className="table-panel">
        <AuditTitle title="Suspicious Trade Flags" count={suspicious.length} />
        {suspicious.length === 0 ? <EmptyAudit message="No suspicious trade flags found." /> : null}
        {suspicious.map((item) => (
          <article className="audit-row four-col" key={item.id}>
            <div>
              <strong>{formatDateTime(item.createdAt)}</strong>
              <span className={`status-pill ${item.severity}`}>{labelize(item.severity)}</span>
            </div>
            <div>
              <strong>{item.reason}</strong>
              <small>Offer {item.offerId ? shortId(item.offerId) : 'none'}</small>
            </div>
            <div>
              <strong>Player {item.playerId ? shortId(item.playerId) : 'unknown'}</strong>
              <small>Related {item.relatedPlayerId ? shortId(item.relatedPlayerId) : 'none'}</small>
            </div>
            <small>{summarizeObject(item.payload)}</small>
          </article>
        ))}
      </section>
    </div>
  );
}

function NavalView({ attacks, blockades }: { attacks: NavalAttackRow[]; blockades: CityBlockadeRow[] }) {
  return (
    <div className="audit-stack">
      <section className="table-panel">
        <AuditTitle title="Naval Attacks" count={attacks.length} />
        {attacks.length === 0 ? <EmptyAudit message="No naval attacks found." /> : null}
        {attacks.map((attack) => (
          <article className="audit-row five-col" key={attack.id}>
            <div>
              <strong>{attack.result ? labelize(attack.result) : labelize(attack.status)}</strong>
              <span className={`status-pill ${attack.status}`}>{labelize(attack.status)}</span>
              <small>{shortId(attack.id)}</small>
            </div>
            <div>
              <strong>{shortId(attack.originCityId)} {' -> '}{shortId(attack.targetCityId)}</strong>
              <small>{shortId(attack.attackerPlayerId)} vs {shortId(attack.defenderPlayerId)}</small>
            </div>
            <div>
              <strong>{formatDateTime(attack.startedAt)}</strong>
              <small>{attack.resolvedAt ? `Resolved ${formatDateTime(attack.resolvedAt)}` : 'Not resolved'}</small>
            </div>
            <div className="payload-summary">
              {summarizeShips('Sent', attack.sentLightShip, attack.sentRamShip, attack.sentFireShip).map((item) => <span key={item}>{item}</span>)}
              {summarizeShips('Lost', attack.lostLightShip, attack.lostRamShip, attack.lostFireShip).map((item) => <span key={item}>{item}</span>)}
            </div>
            <div>
              <strong>Power {formatOptionalNumber(attack.attackerPower)} / {formatOptionalNumber(attack.defenderPower)}</strong>
              <small>{attack.blockadeCreated ? `Blockade ${shortId(attack.blockadeId ?? '')}` : 'No blockade'}</small>
            </div>
          </article>
        ))}
      </section>
      <section className="table-panel">
        <AuditTitle title="Blockades" count={blockades.length} />
        {blockades.length === 0 ? <EmptyAudit message="No blockades found." /> : null}
        {blockades.map((blockade) => (
          <article className="audit-row four-col" key={blockade.id}>
            <div>
              <strong>{labelize(blockade.status)}</strong>
              <small>{shortId(blockade.id)}</small>
            </div>
            <div>
              <strong>{shortId(blockade.originCityId)} {' -> '}{shortId(blockade.targetCityId)}</strong>
              <small>{shortId(blockade.attackerPlayerId)} vs {shortId(blockade.defenderPlayerId)}</small>
            </div>
            <div>
              <strong>{formatDateTime(blockade.startedAt)} {' -> '}{formatDateTime(blockade.endsAt)}</strong>
              <small>{blockade.endedAt ? `Ended ${formatDateTime(blockade.endedAt)}` : 'Active window'}</small>
            </div>
            <div className="payload-summary">
              {summarizeShips('Committed', blockade.committedLightShip, blockade.committedRamShip, blockade.committedFireShip).map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function ScoutingView({ missions }: { missions: SpyMissionRow[] }) {
  if (missions.length === 0) {
    return <section className="panel empty-panel"><p className="muted">No spy missions found.</p></section>;
  }

  return (
    <div className="table-panel">
      {missions.map((mission) => (
        <article className="audit-row five-col" key={mission.id}>
          <div>
            <strong>{labelize(mission.missionType)}</strong>
            <span className={`status-pill ${mission.status}`}>{labelize(mission.status)}</span>
            <small>{shortId(mission.id)}</small>
          </div>
          <div>
            <strong>{mission.attackerPlayer?.name ?? 'Unknown attacker'}</strong>
            <small>{mission.originCity?.name ?? 'Unknown origin'}</small>
          </div>
          <div>
            <strong>{mission.targetPlayer?.name ?? 'Unknown target'}</strong>
            <small>{mission.targetCity?.name ?? 'Unknown city'}</small>
          </div>
          <div>
            <strong>{formatDateTime(mission.startedAt)}</strong>
            <small>{mission.resolvedAt ? `Resolved ${formatDateTime(mission.resolvedAt)}` : 'In progress'}</small>
          </div>
          <div className="payload-summary">
            <span>Success {formatPercent(mission.successChance)}</span>
            <span>Detect {formatPercent(mission.detectionChance)}</span>
            {mission.wasSuccessful !== null && mission.wasSuccessful !== undefined ? <span>{mission.wasSuccessful ? 'Succeeded' : 'Failed'}</span> : null}
            {mission.wasDetected ? <span>Detected</span> : null}
            {mission.spyLost ? <span>Spy lost</span> : null}
          </div>
        </article>
      ))}
    </div>
  );
}

function SuspiciousView({ data }: { data: any }) {
  const suspiciousTrades: SuspiciousTradeRow[] = data.suspiciousTrades ?? [];
  const activity: ActivityRow[] = data.activity ?? [];
  const abuseSignals: ActivityRow[] = data.abuseSignals ?? [];

  return (
    <div className="audit-stack">
      <section className="table-panel">
        <AuditTitle title="Suspicious Trades" count={suspiciousTrades.length} />
        {suspiciousTrades.length === 0 ? <EmptyAudit message="No suspicious trades found." /> : null}
        {suspiciousTrades.map((item) => (
          <article className="audit-row four-col" key={item.id}>
            <div>
              <strong>{formatDateTime(item.createdAt)}</strong>
              <span className={`status-pill ${item.severity}`}>{labelize(item.severity)}</span>
            </div>
            <div>
              <strong>{item.reason}</strong>
              <small>Offer {item.offerId ? shortId(item.offerId) : 'none'}</small>
            </div>
            <div>
              <strong>Player {item.playerId ? shortId(item.playerId) : 'unknown'}</strong>
              <small>Related {item.relatedPlayerId ? shortId(item.relatedPlayerId) : 'none'}</small>
            </div>
            <small>{summarizeObject(item.payload)}</small>
          </article>
        ))}
      </section>
      <section className="table-panel">
        <AuditTitle title="Sensitive Activity" count={activity.length} />
        {activity.length === 0 ? <EmptyAudit message="No sensitive activity found." /> : null}
        {activity.map((item) => (
          <article className="audit-row four-col" key={item.id}>
            <div>
              <strong>{formatDateTime(item.createdAt)}</strong>
              <small>{shortId(item.id)}</small>
            </div>
            <div>
              <strong>{labelize(item.eventType ?? item.actionType ?? 'activity')}</strong>
              <small>Player {item.playerId ? shortId(item.playerId) : 'unknown'}</small>
            </div>
            <small>{summarizeObject(item.payload)}</small>
            <span className="payload-chip">analytics</span>
          </article>
        ))}
      </section>
      <section className="table-panel">
        <AuditTitle title="Open Abuse Signals" count={abuseSignals.length} />
        {abuseSignals.length === 0 ? <EmptyAudit message="No open abuse signals found." /> : null}
        {abuseSignals.map((item) => (
          <article className="audit-row four-col" key={item.id}>
            <div>
              <strong>{item.title ?? labelize(item.signalType ?? 'signal')}</strong>
              <span className={`status-pill ${item.severity ?? 'low'}`}>{labelize(item.severity ?? 'low')}</span>
            </div>
            <div>
              <strong>Score {item.score ?? 0}</strong>
              <small>{item.status ? labelize(item.status) : 'open'}</small>
            </div>
            <div>
              <strong>{item.reason ?? 'No reason'}</strong>
              <small>Player {item.playerId ? shortId(item.playerId) : 'unknown'}</small>
            </div>
            <small>{formatDateTime(item.createdAt)}</small>
          </article>
        ))}
      </section>
    </div>
  );
}

function ActionLogsView({ logs }: { logs: AdminLogRow[] }) {
  if (logs.length === 0) {
    return <section className="panel empty-panel"><p className="muted">No admin action logs found.</p></section>;
  }

  return (
    <div className="table-panel">
      {logs.map((log) => (
        <article className="audit-row five-col" key={log.id}>
          <div>
            <strong>{formatDateTime(log.createdAt)}</strong>
            <small>{shortId(log.id)}</small>
          </div>
          <div>
            <strong>{labelize(log.actionType)}</strong>
            <small>{log.reason ?? 'No reason'}</small>
          </div>
          <div>
            <strong>{log.admin?.displayName ?? log.admin?.email ?? 'Unknown admin'}</strong>
            <small>{log.admin?.email ?? 'No admin email'}</small>
          </div>
          <div>
            <strong>{log.targetType ? labelize(log.targetType) : 'No target'}</strong>
            <small>{log.targetId ? shortId(log.targetId) : 'No target ID'}</small>
          </div>
          <small>{summarizeObject(log.metadata)}</small>
        </article>
      ))}
    </div>
  );
}

function AuditTitle({ title, count }: { title: string; count: number }) {
  return (
    <div className="audit-title">
      <strong>{title}</strong>
      <span>{count}</span>
    </div>
  );
}

function EmptyAudit({ message }: { message: string }) {
  return <p className="muted empty-audit">{message}</p>;
}

function AntiAbuseView(props: {
  data: any;
  request: <T>(path: string, init?: RequestInit) => Promise<T>;
  reload: () => void;
}) {
  const [flags, setFlags] = useState<any[]>([]);
  const [status, setStatus] = useState('open');
  const [riskLevel, setRiskLevel] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function loadFlags() {
    setError(null);
    const params = new URLSearchParams({ limit: '50' });
    if (status) params.set('status', status);
    if (riskLevel) params.set('riskLevel', riskLevel);
    try {
      const response = await props.request<any>(`/admin/anti-abuse/flags?${params.toString()}`);
      setFlags(response.flags ?? response.signals ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load flags.');
    }
  }

  useEffect(() => {
    void loadFlags();
  }, [status, riskLevel]);

  async function updateFlag(flagId: string, nextStatus: string) {
    await props.request(`/admin/anti-abuse/flags/${flagId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: nextStatus, resolutionNote: `Marked ${nextStatus}` }),
    });
    await loadFlags();
    props.reload();
  }

  return (
    <div className="overview-grid">
      {[
        ['Open flags', props.data.openFlags ?? props.data.counts?.open ?? 0],
        ['Critical', props.data.criticalFlags ?? 0],
        ['High', props.data.highFlags ?? 0],
        ['Today', props.data.flagsToday ?? 0],
      ].map(([label, value]) => (
        <article className="metric-card" key={label}>
          <span>{label}</span>
          <strong>{String(value)}</strong>
        </article>
      ))}
      <section className="panel wide">
        <div className="toolbar-actions">
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            {['open', 'reviewing', 'escalated', 'resolved', 'dismissed', 'false_positive'].map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <select value={riskLevel} onChange={(event) => setRiskLevel(event.target.value)}>
            <option value="">All risk</option>
            {['critical', 'high', 'medium', 'low'].map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <button className="ghost-button" type="button" onClick={() => void loadFlags()}>Refresh Flags</button>
        </div>
        {error ? <p className="error-banner">{error}</p> : null}
        <div className="table-panel">
          {flags.map((flag) => (
            <article className="table-row json-row" key={flag.id}>
              <strong>{flag.riskLevel ?? flag.severity} · {flag.flagType ?? flag.signalType}</strong>
              <span>{flag.player?.name ?? flag.player?.playerName ?? flag.playerId ?? 'Unknown player'}</span>
              <span>{flag.relatedPlayer?.name ?? flag.relatedPlayerId ?? 'No related player'}</span>
              <span>score {flag.score} · {flag.status}</span>
              <code>{JSON.stringify(flag.payload ?? {})}</code>
              <div className="actions">
                <button className="ghost-button compact-button" type="button" onClick={() => void updateFlag(flag.id, 'reviewing')}>Reviewing</button>
                <button className="primary-button compact-button" type="button" onClick={() => void updateFlag(flag.id, 'resolved')}>Resolve</button>
                <button className="ghost-button compact-button" type="button" onClick={() => void updateFlag(flag.id, 'false_positive')}>False Positive</button>
                <button className="danger-button compact-button" type="button" onClick={() => void updateFlag(flag.id, 'escalated')}>Escalate</button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function JsonTable({ data }: { data: any }) {
  const rows = Object.entries(data).flatMap(([group, value]) =>
    Array.isArray(value) ? value.map((row) => ({ group, row })) : [{ group, row: value }],
  );
  return (
    <div className="table-panel">
      {rows.map((item, index) => (
        <article className="table-row json-row" key={`${item.group}-${index}`}>
          <strong>{item.group}</strong>
          <code>{JSON.stringify(item.row)}</code>
        </article>
      ))}
    </div>
  );
}

function Status({ moderation }: { moderation: Record<string, unknown> | null }) {
  const label = moderation?.status ? String(moderation.status) : 'clear';
  return <span className={`status-pill ${label}`}>{label}</span>;
}

function labelize(value: string) {
  return value
    .replace(/[_-]/g, ' ')
    .replace(/[A-Z]/g, (match) => ` ${match.toLowerCase()}`)
    .trim();
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

function formatSignedNumber(value: number) {
  const formatted = formatNumber(Math.abs(value));
  return value > 0 ? `+${formatted}` : value < 0 ? `-${formatted}` : formatted;
}

function formatOptionalNumber(value: number | null | undefined) {
  return typeof value === 'number' ? formatNumber(value) : '-';
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function shortId(value: string) {
  if (!value) return 'none';
  return value.length > 12 ? `${value.slice(0, 8)}...` : value;
}

function getBattleDestinationLabel(battle: BattleMovement) {
  const payload = battle.payload ?? {};
  if (typeof payload.campName === 'string') return payload.campName;
  if (typeof payload.targetCityName === 'string') return payload.targetCityName;
  return battle.destinationCampId ? `Camp ${shortId(battle.destinationCampId)}` : 'Unknown target';
}

function getBattleTargetLabel(battle: BattleMovement) {
  const payload = battle.payload ?? {};
  if (typeof payload.targetPlayerName === 'string') return `Target player: ${payload.targetPlayerName}`;
  if (typeof payload.campLevel === 'number') return `PvE camp level ${payload.campLevel}`;
  if (battle.destinationCampId) return `Camp ID ${shortId(battle.destinationCampId)}`;
  return battle.destinationCity?.id ? `City ID ${shortId(battle.destinationCity.id)}` : 'No target details';
}

function getReturnTimeLabel(battle: BattleMovement) {
  return battle.returnArrivalTime ? `Return ${formatDateTime(battle.returnArrivalTime)}` : 'No return time';
}

function summarizeBattlePayload(payload: BattleMovement['payload']) {
  if (!payload) return ['No payload'];
  const summary: string[] = [];
  const units = summarizeNumberMap(payload.units, 'units');
  const loot = summarizeNumberMap(payload.loot, 'loot');
  if (units) summary.push(units);
  if (loot) summary.push(loot);
  if (isRecord(payload.battle)) {
    if (typeof payload.battle.attackerVictory === 'boolean') {
      summary.push(payload.battle.attackerVictory ? 'Attacker won' : 'Defender held');
    }
    if (typeof payload.battle.rounds === 'number') {
      summary.push(`${payload.battle.rounds} rounds`);
    }
  }
  if (typeof payload.campPower === 'number') summary.push(`Power ${formatNumber(payload.campPower)}`);
  return summary.length > 0 ? summary : ['Payload recorded'];
}

function summarizeNumberMap(value: unknown, label: string) {
  if (!isRecord(value)) return null;
  const entries = Object.entries(value)
    .filter(([, amount]) => typeof amount === 'number' && amount > 0)
    .map(([key, amount]) => `${labelize(key)} ${formatNumber(amount as number)}`);
  if (entries.length === 0) return null;
  return `${label}: ${entries.slice(0, 3).join(', ')}${entries.length > 3 ? '...' : ''}`;
}

function summarizeShips(label: string, light = 0, ram = 0, fire = 0) {
  const ships = [
    light > 0 ? `light ${formatNumber(light)}` : null,
    ram > 0 ? `ram ${formatNumber(ram)}` : null,
    fire > 0 ? `fire ${formatNumber(fire)}` : null,
  ].filter(Boolean);
  return ships.length > 0 ? [`${label}: ${ships.join(', ')}`] : [`${label}: none`];
}

function summarizeObject(value: unknown) {
  if (!isRecord(value)) return 'No details';
  const entries = Object.entries(value)
    .filter(([, item]) => item !== null && item !== undefined && typeof item !== 'object')
    .slice(0, 3)
    .map(([key, item]) => `${labelize(key)} ${String(item)}`);
  return entries.length > 0 ? entries.join(' · ') : 'Details recorded';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AdminApp />
  </React.StrictMode>,
);
