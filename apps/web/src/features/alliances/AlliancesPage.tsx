import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AllianceDetail, AllianceProjectType, AllianceRole, ResourceBalance } from '@island-empires/shared-types';
import { FormEvent, useMemo, useState } from 'react';
import { Alert, Button, ErrorState, LoadingState, Panel } from '../../components/ui';
import { getBootstrap, getCities } from '../city/city.api';
import {
  acceptAllianceApplication,
  applyToAlliance,
  createAlliance,
  createAllianceAnnouncement,
  createAllianceHelpRequest,
  createAllianceTradeRequest,
  donateToAlliance,
  disbandAlliance,
  getAllianceCooperation,
  getAllianceApplications,
  getAllianceChat,
  getMyAlliance,
  invitePlayer,
  leaveAlliance,
  listAlliances,
  rejectAllianceApplication,
  searchPlayers,
  sendAllianceChat,
  shareAllianceBattleReport,
  startAllianceProject,
  updateAllianceProfile,
} from './alliances.api';

const inputClassName =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm font-semibold text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20';
const textareaClassName = `${inputClassName} min-h-24 resize-y`;
const managerRoles: AllianceRole[] = ['leader', 'officer'];
const recruiterRoles: AllianceRole[] = ['leader', 'officer', 'recruiter'];
const resources: Array<keyof ResourceBalance> = ['wood', 'gold', 'marble', 'wine', 'crystal', 'sulfur'];
const projectOptions: Array<{ type: AllianceProjectType; label: string }> = [
  { type: 'trade_harbor', label: 'Trade Harbor' },
  { type: 'research_library', label: 'Research Library' },
  { type: 'defensive_monument', label: 'Defensive Monument' },
  { type: 'island_festival', label: 'Island Festival' },
];

export function AlliancesPage() {
  const queryClient = useQueryClient();
  const [directoryQuery, setDirectoryQuery] = useState('');
  const [createForm, setCreateForm] = useState({ name: '', tag: '', description: '' });
  const [applicationMessage, setApplicationMessage] = useState('');
  const [inviteQuery, setInviteQuery] = useState('');
  const [invitePlayerId, setInvitePlayerId] = useState('');
  const [chatBody, setChatBody] = useState('');
  const [announcementForm, setAnnouncementForm] = useState({ title: '', body: '' });
  const [profileForm, setProfileForm] = useState({ name: '', tag: '', description: '' });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [donationForm, setDonationForm] = useState({
    cityId: '',
    projectId: '',
    wood: 0,
    gold: 0,
    marble: 0,
    wine: 0,
    crystal: 0,
    sulfur: 0,
  });
  const [projectType, setProjectType] = useState<AllianceProjectType>('trade_harbor');
  const [helpForm, setHelpForm] = useState<{ kind: 'resources' | 'defense' | 'advice'; message: string }>({
    kind: 'resources',
    message: '',
  });
  const [tradeForm, setTradeForm] = useState({
    offeredResource: 'wood' as keyof ResourceBalance,
    offeredAmount: 100,
    requestedResource: 'marble' as keyof ResourceBalance,
    requestedAmount: 100,
    message: '',
  });
  const [battleShareForm, setBattleShareForm] = useState({ reportId: '', message: '' });

  const bootstrapQuery = useQuery({ queryKey: ['bootstrap'], queryFn: getBootstrap, retry: 1 });
  const citiesQuery = useQuery({ queryKey: ['cities'], queryFn: getCities, retry: 1 });
  const myAllianceQuery = useQuery({
    queryKey: ['alliances', 'me'],
    queryFn: getMyAlliance,
    retry: 1,
  });
  const directoryQueryResult = useQuery({
    queryKey: ['alliances', 'directory', directoryQuery],
    queryFn: () => listAlliances(directoryQuery),
    retry: 1,
  });

  const alliance = myAllianceQuery.data?.alliance ?? null;
  const canManage = Boolean(alliance?.myRole && managerRoles.includes(alliance.myRole));
  const canRecruit = Boolean(alliance?.myRole && recruiterRoles.includes(alliance.myRole));

  const applicationsQuery = useQuery({
    queryKey: ['alliances', alliance?.id, 'applications'],
    queryFn: () => getAllianceApplications(alliance?.id ?? ''),
    enabled: Boolean(alliance?.id && canRecruit),
    retry: 1,
  });
  const chatQuery = useQuery({
    queryKey: ['alliances', alliance?.id, 'chat'],
    queryFn: () => getAllianceChat(alliance?.id ?? ''),
    enabled: Boolean(alliance?.id),
    retry: 1,
    refetchInterval: 10000,
  });
  const cooperationQuery = useQuery({
    queryKey: ['alliances', alliance?.id, 'cooperation'],
    queryFn: () => getAllianceCooperation(alliance?.id ?? ''),
    enabled: Boolean(alliance?.id),
    retry: 1,
  });
  const playerSearchQuery = useQuery({
    queryKey: ['players', 'alliance-invite', bootstrapQuery.data?.world.id, inviteQuery],
    queryFn: () => searchPlayers(bootstrapQuery.data?.world.id ?? '', inviteQuery),
    enabled: Boolean(bootstrapQuery.data?.world.id && inviteQuery.trim().length >= 2),
    retry: 1,
  });

  const createMutation = useMutation({
    mutationFn: () => createAlliance(createForm),
    onSuccess: (response) => {
      setCreateForm({ name: '', tag: '', description: '' });
      seedProfileForm(response.alliance);
      void queryClient.invalidateQueries({ queryKey: ['alliances'] });
    },
  });
  const applyMutation = useMutation({
    mutationFn: (allianceId: string) => applyToAlliance(allianceId, { message: applicationMessage }),
    onSuccess: () => setApplicationMessage(''),
  });
  const inviteMutation = useMutation({
    mutationFn: () => invitePlayer(alliance?.id ?? '', { playerId: invitePlayerId }),
    onSuccess: () => {
      setInvitePlayerId('');
      setInviteQuery('');
    },
  });
  const chatMutation = useMutation({
    mutationFn: () => sendAllianceChat(alliance?.id ?? '', { body: chatBody }),
    onSuccess: () => {
      setChatBody('');
      void queryClient.invalidateQueries({ queryKey: ['alliances', alliance?.id, 'chat'] });
    },
  });
  const announcementMutation = useMutation({
    mutationFn: () => createAllianceAnnouncement(alliance?.id ?? '', announcementForm),
    onSuccess: () => {
      setAnnouncementForm({ title: '', body: '' });
      void queryClient.invalidateQueries({ queryKey: ['alliances', 'me'] });
    },
  });
  const donationMutation = useMutation({
    mutationFn: () =>
      donateToAlliance(alliance?.id ?? '', {
        ...donationForm,
        cityId: donationForm.cityId || bootstrapQuery.data?.selectedCityId || '',
        projectId: donationForm.projectId || undefined,
      }),
    onSuccess: () => {
      setDonationForm((current) => ({
        ...current,
        wood: 0,
        gold: 0,
        marble: 0,
        wine: 0,
        crystal: 0,
        sulfur: 0,
      }));
      void queryClient.invalidateQueries({ queryKey: ['alliances'] });
    },
  });
  const startProjectMutation = useMutation({
    mutationFn: () => startAllianceProject(alliance?.id ?? '', { projectType }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['alliances'] }),
  });
  const helpMutation = useMutation({
    mutationFn: () => createAllianceHelpRequest(alliance?.id ?? '', helpForm),
    onSuccess: () => {
      setHelpForm({ kind: 'resources', message: '' });
      void queryClient.invalidateQueries({ queryKey: ['alliances', alliance?.id, 'cooperation'] });
    },
  });
  const tradeMutation = useMutation({
    mutationFn: () => createAllianceTradeRequest(alliance?.id ?? '', tradeForm),
    onSuccess: () => {
      setTradeForm((current) => ({ ...current, message: '' }));
      void queryClient.invalidateQueries({ queryKey: ['alliances', alliance?.id, 'cooperation'] });
    },
  });
  const shareBattleMutation = useMutation({
    mutationFn: () => shareAllianceBattleReport(alliance?.id ?? '', battleShareForm),
    onSuccess: () => {
      setBattleShareForm({ reportId: '', message: '' });
      void queryClient.invalidateQueries({ queryKey: ['alliances', alliance?.id, 'cooperation'] });
    },
  });
  const profileMutation = useMutation({
    mutationFn: () => updateAllianceProfile(alliance?.id ?? '', profileForm),
    onSuccess: (response) => {
      seedProfileForm(response.alliance);
      setIsEditingProfile(false);
      void queryClient.invalidateQueries({ queryKey: ['alliances'] });
    },
  });
  const acceptMutation = useMutation({
    mutationFn: acceptAllianceApplication,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['alliances'] });
    },
  });
  const rejectMutation = useMutation({
    mutationFn: rejectAllianceApplication,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['alliances', alliance?.id, 'applications'] });
    },
  });
  const leaveMutation = useMutation({
    mutationFn: () => leaveAlliance(alliance?.id ?? ''),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['alliances'] }),
  });
  const disbandMutation = useMutation({
    mutationFn: () => disbandAlliance(alliance?.id ?? ''),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['alliances'] }),
  });

  const selectedInvitePlayer = useMemo(
    () => playerSearchQuery.data?.players.find((player) => player.id === invitePlayerId),
    [invitePlayerId, playerSearchQuery.data?.players],
  );

  function seedProfileForm(nextAlliance: AllianceDetail | null) {
    if (!nextAlliance) return;
    setProfileForm({
      name: nextAlliance.name,
      tag: nextAlliance.tag,
      description: nextAlliance.description,
    });
  }

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createMutation.mutate();
  }

  function handleProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    profileMutation.mutate();
  }

  function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    inviteMutation.mutate();
  }

  function handleChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    chatMutation.mutate();
  }

  function handleAnnouncement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    announcementMutation.mutate();
  }

  function handleDonation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    donationMutation.mutate();
  }

  function handleHelp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    helpMutation.mutate();
  }

  function handleTrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    tradeMutation.mutate();
  }

  function handleBattleShare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    shareBattleMutation.mutate();
  }

  if (bootstrapQuery.isLoading || myAllianceQuery.isLoading) {
    return <LoadingState message="Opening alliances..." />;
  }

  if (bootstrapQuery.isError || myAllianceQuery.isError) {
    return <ErrorState title="Unable to load alliances." />;
  }

  if (!alliance) {
    return (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel title="Alliance Directory" subtitle="Find player groups recruiting in this world.">
          <input
            className={inputClassName}
            value={directoryQuery}
            onChange={(event) => setDirectoryQuery(event.target.value)}
            placeholder="Search by name or tag"
          />
          <label className="block space-y-1">
            <span className="text-xs font-black uppercase tracking-wide text-muted">Application</span>
            <textarea
              className={textareaClassName}
              value={applicationMessage}
              onChange={(event) => setApplicationMessage(event.target.value)}
              placeholder="Optional note to alliance recruiters"
            />
          </label>
          {directoryQueryResult.isLoading ? <LoadingState message="Loading alliances..." /> : null}
          <div className="space-y-3">
            {(directoryQueryResult.data?.alliances ?? []).map((item) => (
              <div key={item.id} className="rounded-md border border-border bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-black text-text">
                      [{item.tag}] {item.name}
                    </p>
                    <p className="text-sm font-semibold text-muted">{item.memberCount} members</p>
                  </div>
                  <Button
                    onClick={() => applyMutation.mutate(item.id)}
                    disabled={applyMutation.isPending}
                  >
                    Apply
                  </Button>
                </div>
                {item.description ? (
                  <p className="mt-3 text-sm font-semibold text-muted">{item.description}</p>
                ) : null}
              </div>
            ))}
          </div>
          {applyMutation.isError ? <Alert variant="danger">{applyMutation.error.message}</Alert> : null}
          {applyMutation.isSuccess ? <Alert>Application submitted.</Alert> : null}
        </Panel>

        <Panel title="Create Alliance" subtitle="Found a new alliance and become leader.">
          <form className="space-y-3" onSubmit={handleCreate}>
            <input
              className={inputClassName}
              value={createForm.name}
              onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Alliance name"
              required
            />
            <input
              className={inputClassName}
              value={createForm.tag}
              onChange={(event) => setCreateForm((current) => ({ ...current, tag: event.target.value }))}
              placeholder="Tag"
              maxLength={5}
              required
            />
            <textarea
              className={textareaClassName}
              value={createForm.description}
              onChange={(event) =>
                setCreateForm((current) => ({ ...current, description: event.target.value }))
              }
              placeholder="Description"
            />
            <Button type="submit" disabled={createMutation.isPending}>
              Create
            </Button>
            {createMutation.isError ? <Alert variant="danger">{createMutation.error.message}</Alert> : null}
          </form>
        </Panel>
      </div>
    );
  }

  const cooperation = cooperationQuery.data ?? {
    treasury: alliance.treasury ?? emptyResources(),
    activeProjects: alliance.activeProjects ?? [],
    bonuses: alliance.bonuses ?? [],
    activityFeed: alliance.activityFeed ?? [],
    contributionLeaderboard: alliance.contributionLeaderboard ?? [],
    rankings: [],
  };
  const availableProjects = projectOptions.filter(
    (option) => !cooperation.activeProjects.some((project) => project.projectType === option.type),
  );

  return (
    <div className="space-y-6">
      <Panel
        title={`[${alliance.tag}] ${alliance.name}`}
        subtitle={`${alliance.memberCount} members. Your role: ${alliance.myRole ?? 'member'}.`}
        action={
          <div className="flex gap-2">
            {canManage ? (
              <Button
                variant="secondary"
                onClick={() => {
                  seedProfileForm(alliance);
                  setIsEditingProfile((current) => !current);
                }}
              >
                Edit Profile
              </Button>
            ) : null}
            <Button variant="secondary" onClick={() => leaveMutation.mutate()}>
              Leave
            </Button>
            {alliance.myRole === 'leader' ? (
              <Button variant="danger" onClick={() => disbandMutation.mutate()}>
                Disband
              </Button>
            ) : null}
          </div>
        }
      >
        <p className="text-sm font-semibold text-muted">{alliance.description || 'No description.'}</p>
        {isEditingProfile ? (
          <form className="grid gap-3 md:grid-cols-[1fr_120px]" onSubmit={handleProfile}>
            <input className={inputClassName} value={profileForm.name} onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))} />
            <input className={inputClassName} value={profileForm.tag} onChange={(event) => setProfileForm((current) => ({ ...current, tag: event.target.value }))} maxLength={5} />
            <textarea className={`${textareaClassName} md:col-span-2`} value={profileForm.description} onChange={(event) => setProfileForm((current) => ({ ...current, description: event.target.value }))} />
            <Button type="submit" disabled={profileMutation.isPending}>Save</Button>
          </form>
        ) : null}
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel title="Alliance Treasury" subtitle="Donated resources owned by the alliance.">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {resources.map((resource) => (
              <div key={resource} className="rounded-md border border-border bg-surface p-3">
                <p className="text-xs font-black uppercase tracking-wide text-muted">{resource}</p>
                <p className="text-xl font-black text-text">{formatNumber(cooperation.treasury[resource])}</p>
              </div>
            ))}
          </div>
          <form className="space-y-3" onSubmit={handleDonation}>
            <div className="grid gap-2 md:grid-cols-2">
              <select
                className={inputClassName}
                value={donationForm.cityId || bootstrapQuery.data?.selectedCityId || ''}
                onChange={(event) => setDonationForm((current) => ({ ...current, cityId: event.target.value }))}
              >
                {(citiesQuery.data ?? []).map((city) => (
                  <option key={city.id} value={city.id}>{city.name}</option>
                ))}
              </select>
              <select
                className={inputClassName}
                value={donationForm.projectId}
                onChange={(event) => setDonationForm((current) => ({ ...current, projectId: event.target.value }))}
              >
                <option value="">Treasury only</option>
                {cooperation.activeProjects
                  .filter((project) => project.status === 'active')
                  .map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {resources.map((resource) => (
                <input
                  key={resource}
                  className={inputClassName}
                  type="number"
                  min="0"
                  value={donationForm[resource]}
                  onChange={(event) =>
                    setDonationForm((current) => ({ ...current, [resource]: Number(event.target.value) }))
                  }
                  placeholder={resource}
                />
              ))}
            </div>
            <Button type="submit" disabled={donationMutation.isPending}>Donate</Button>
            {donationMutation.isError ? <Alert variant="danger">{donationMutation.error.message}</Alert> : null}
          </form>
        </Panel>

        <Panel title="Alliance Bonuses" subtitle="Unlocked by completed projects.">
          <div className="space-y-2">
            {cooperation.bonuses.length > 0 ? cooperation.bonuses.map((bonus) => (
              <div key={bonus.bonusType} className="rounded-md border border-border bg-surface p-3">
                <p className="font-black text-text">{bonus.label}</p>
                <p className="text-sm font-semibold text-muted">{bonus.description}</p>
              </div>
            )) : <p className="text-sm font-semibold text-muted">No alliance bonuses unlocked yet.</p>}
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel title="Alliance Projects" subtitle="Shared goals funded by member donations.">
          {canManage ? (
            <div className="flex flex-wrap gap-2">
              <select className={inputClassName} value={projectType} onChange={(event) => setProjectType(event.target.value as AllianceProjectType)}>
                {(availableProjects.length > 0 ? availableProjects : projectOptions).map((option) => (
                  <option key={option.type} value={option.type}>{option.label}</option>
                ))}
              </select>
              <Button onClick={() => startProjectMutation.mutate()} disabled={startProjectMutation.isPending || availableProjects.length === 0}>
                Start Project
              </Button>
            </div>
          ) : null}
          <div className="space-y-3">
            {cooperation.activeProjects.map((project) => (
              <div key={project.id} className="rounded-md border border-border bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-black text-text">{project.name}</p>
                    <p className="text-sm font-semibold text-muted">{project.description}</p>
                  </div>
                  <span className="rounded bg-surface-strong px-2 py-1 text-xs font-black uppercase text-primary">{project.status}</span>
                </div>
                <div className="mt-3 h-2 rounded bg-surface-strong">
                  <div className="h-2 rounded bg-primary" style={{ width: `${project.progressPercent}%` }} />
                </div>
                <p className="mt-2 text-xs font-black uppercase tracking-wide text-muted">{project.progressPercent}% funded</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-muted md:grid-cols-3">
                  {resources.map((resource) => (
                    <span key={resource}>{resource}: {formatNumber(project.contributed[resource])}/{formatNumber(project.cost[resource])}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Contribution Leaders" subtitle="Donation score by current member.">
          <div className="space-y-2">
            {cooperation.contributionLeaderboard.map((member, index) => (
              <div key={member.playerId} className="flex items-center justify-between rounded-md border border-border bg-surface p-3">
                <span className="font-bold text-text">#{index + 1} {member.playerName}</span>
                <span className="text-sm font-black text-primary">{formatNumber(member.contributionScore)}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel title="Help Request" subtitle="Ask members for resources, defense, or advice.">
          <form className="space-y-2" onSubmit={handleHelp}>
            <select className={inputClassName} value={helpForm.kind} onChange={(event) => setHelpForm((current) => ({ ...current, kind: event.target.value as 'resources' | 'defense' | 'advice' }))}>
              <option value="resources">Resources</option>
              <option value="defense">Defense</option>
              <option value="advice">Advice</option>
            </select>
            <textarea className={textareaClassName} value={helpForm.message} onChange={(event) => setHelpForm((current) => ({ ...current, message: event.target.value }))} placeholder="What do you need?" required />
            <Button type="submit" disabled={helpMutation.isPending}>Request</Button>
          </form>
        </Panel>

        <Panel title="Share Trade Request" subtitle="Coordinate trades with alliance members.">
          <form className="space-y-2" onSubmit={handleTrade}>
            <div className="grid grid-cols-2 gap-2">
              <select className={inputClassName} value={tradeForm.offeredResource} onChange={(event) => setTradeForm((current) => ({ ...current, offeredResource: event.target.value as keyof ResourceBalance }))}>
                {resources.map((resource) => <option key={resource} value={resource}>{resource}</option>)}
              </select>
              <input className={inputClassName} type="number" min="1" value={tradeForm.offeredAmount} onChange={(event) => setTradeForm((current) => ({ ...current, offeredAmount: Number(event.target.value) }))} />
              <select className={inputClassName} value={tradeForm.requestedResource} onChange={(event) => setTradeForm((current) => ({ ...current, requestedResource: event.target.value as keyof ResourceBalance }))}>
                {resources.map((resource) => <option key={resource} value={resource}>{resource}</option>)}
              </select>
              <input className={inputClassName} type="number" min="1" value={tradeForm.requestedAmount} onChange={(event) => setTradeForm((current) => ({ ...current, requestedAmount: Number(event.target.value) }))} />
            </div>
            <input className={inputClassName} value={tradeForm.message} onChange={(event) => setTradeForm((current) => ({ ...current, message: event.target.value }))} placeholder="Optional note" />
            <Button type="submit" disabled={tradeMutation.isPending}>Share Trade</Button>
          </form>
        </Panel>

        <Panel title="Share Battle Report" subtitle="Post one of your battle report IDs to the feed.">
          <form className="space-y-2" onSubmit={handleBattleShare}>
            <input className={inputClassName} value={battleShareForm.reportId} onChange={(event) => setBattleShareForm((current) => ({ ...current, reportId: event.target.value }))} placeholder="Battle report ID" required />
            <input className={inputClassName} value={battleShareForm.message} onChange={(event) => setBattleShareForm((current) => ({ ...current, message: event.target.value }))} placeholder="Optional note" />
            <Button type="submit" disabled={shareBattleMutation.isPending}>Share Report</Button>
          </form>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel title="Alliance Activity" subtitle="Recent cooperation events.">
          <div className="space-y-2">
            {cooperation.activityFeed.map((entry) => (
              <div key={entry.id} className="rounded-md border border-border bg-surface p-3">
                <p className="text-sm font-semibold text-text">{entry.message}</p>
                <p className="text-xs font-black uppercase tracking-wide text-muted">{new Date(entry.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Alliance Ranking" subtitle="Cooperative standing in this world.">
          <div className="space-y-2">
            {cooperation.rankings.map((ranking) => (
              <div key={ranking.allianceId} className="rounded-md border border-border bg-surface p-3">
                <p className="font-black text-text">#{ranking.rank} [{ranking.allianceTag}] {ranking.allianceName}</p>
                <p className="text-sm font-semibold text-muted">{ranking.completedProjects} projects · {formatNumber(ranking.contributionScore)} contribution</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel title="Alliance Chat" subtitle="Messages are visible to current members.">
          <div className="max-h-[360px] space-y-2 overflow-y-auto rounded-md border border-border bg-surface p-3">
            {(chatQuery.data?.messages ?? []).map((message) => (
              <div key={message.id} className="rounded border border-border/70 bg-surface-strong p-3">
                <p className="text-xs font-black uppercase tracking-wide text-primary">{message.playerName}</p>
                <p className="mt-1 text-sm font-semibold text-text">{message.body}</p>
              </div>
            ))}
          </div>
          <form className="flex gap-2" onSubmit={handleChat}>
            <input
              className={inputClassName}
              value={chatBody}
              onChange={(event) => setChatBody(event.target.value)}
              placeholder="Write to alliance chat"
              required
            />
            <Button type="submit" disabled={chatMutation.isPending}>Send</Button>
          </form>
        </Panel>

        <Panel title="Announcements" subtitle="Pinned updates from leadership.">
          <div className="space-y-3">
            {alliance.announcements.map((announcement) => (
              <div key={announcement.id} className="rounded-md border border-border bg-surface p-3">
                <p className="font-black text-text">{announcement.title}</p>
                <p className="text-sm font-semibold text-muted">{announcement.body}</p>
              </div>
            ))}
          </div>
          {canManage ? (
            <form className="space-y-2" onSubmit={handleAnnouncement}>
              <input className={inputClassName} value={announcementForm.title} onChange={(event) => setAnnouncementForm((current) => ({ ...current, title: event.target.value }))} placeholder="Title" required />
              <textarea className={textareaClassName} value={announcementForm.body} onChange={(event) => setAnnouncementForm((current) => ({ ...current, body: event.target.value }))} placeholder="Announcement" required />
              <Button type="submit" disabled={announcementMutation.isPending}>Post</Button>
            </form>
          ) : null}
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Members" subtitle="Current alliance roster and roles.">
          <div className="space-y-2">
            {alliance.members.map((member) => (
              <div key={member.id} className="flex items-center justify-between rounded-md border border-border bg-surface p-3">
                <span className="font-bold text-text">{member.playerName}</span>
                <span className="rounded bg-surface-strong px-2 py-1 text-xs font-black uppercase text-primary">{member.role}</span>
              </div>
            ))}
          </div>
        </Panel>

        {canRecruit ? (
          <Panel title="Recruiting" subtitle="Invite players and review applications.">
            <form className="space-y-2" onSubmit={handleInvite}>
              <input className={inputClassName} value={inviteQuery} onChange={(event) => setInviteQuery(event.target.value)} placeholder="Search player to invite" />
              <div className="flex flex-wrap gap-2">
                {(playerSearchQuery.data?.players ?? []).map((player) => (
                  <Button key={player.id} variant={invitePlayerId === player.id ? 'primary' : 'secondary'} onClick={() => setInvitePlayerId(player.id)}>
                    {player.name}
                  </Button>
                ))}
              </div>
              <Button type="submit" disabled={!selectedInvitePlayer || inviteMutation.isPending}>Invite</Button>
            </form>
            <div className="space-y-2">
              {(applicationsQuery.data?.applications ?? []).map((application) => (
                <div key={application.id} className="rounded-md border border-border bg-surface p-3">
                  <p className="font-black text-text">{application.playerName}</p>
                  {application.message ? <p className="text-sm font-semibold text-muted">{application.message}</p> : null}
                  <div className="mt-2 flex gap-2">
                    <Button onClick={() => acceptMutation.mutate(application.id)}>Accept</Button>
                    <Button variant="secondary" onClick={() => rejectMutation.mutate(application.id)}>Reject</Button>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        ) : null}
      </div>
    </div>
  );
}

function emptyResources(): ResourceBalance {
  return {
    wood: 0,
    gold: 0,
    marble: 0,
    wine: 0,
    crystal: 0,
    sulfur: 0,
  };
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value);
}
