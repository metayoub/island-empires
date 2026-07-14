import type { NotificationSettings } from '@island-empires/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Badge, Button, ErrorState, LoadingState, Panel } from '../../components/ui';
import {
  archiveNotification,
  disableBrowserPushSubscription,
  getBrowserPushSubscriptions,
  getNotificationCenter,
  markNotificationRead,
  markReportRead,
  saveBrowserPushSubscription,
  updateNotificationSettings,
} from './communications.api';
import { ReportsList } from './components/ReportsList';

const CHANNEL_SETTINGS: Array<{
  key: keyof Pick<NotificationSettings, 'emailEnabled' | 'browserPushEnabled'>;
  label: string;
  help: string;
}> = [
  { key: 'emailEnabled', label: 'Email', help: 'Queue important notices for email delivery.' },
  { key: 'browserPushEnabled', label: 'Browser push', help: 'Queue notices for this browser.' },
];

const EVENT_SETTINGS: Array<{
  key: keyof Omit<
    NotificationSettings,
    'inGameEnabled' | 'emailEnabled' | 'browserPushEnabled' | 'quietHoursStart' | 'quietHoursEnd'
  >;
  label: string;
}> = [
  { key: 'constructionCompleted', label: 'Construction completed' },
  { key: 'researchCompleted', label: 'Research completed' },
  { key: 'tradeArrived', label: 'Trade arrived' },
  { key: 'armyReturned', label: 'Army returned' },
  { key: 'incomingAttack', label: 'Incoming attack' },
  { key: 'allianceMessage', label: 'Alliance message' },
  { key: 'warehouseFull', label: 'Warehouse full' },
  { key: 'eventEnding', label: 'Event ending' },
];

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotificationCenter,
    retry: 1,
    refetchInterval: 15000,
  });
  const pushSubscriptionsQuery = useQuery({
    queryKey: ['notifications', 'browser-push-subscriptions'],
    queryFn: getBrowserPushSubscriptions,
    retry: 1,
  });

  const markReadMutation = useMutation({
    mutationFn: markReportRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  const settingsMutation = useMutation({
    mutationFn: updateNotificationSettings,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  const pushMutation = useMutation({
    mutationFn: async () => {
      if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('Browser push is not available in this browser.');
      }
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Browser push permission was not granted.');
      }
      const publicKey = import.meta.env.VITE_PUSH_PUBLIC_KEY;
      if (!publicKey) {
        throw new Error('Browser push public key is not configured.');
      }
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error('Browser push subscription is incomplete.');
      }
      return saveBrowserPushSubscription({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        userAgent: navigator.userAgent,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({
        queryKey: ['notifications', 'browser-push-subscriptions'],
      });
    },
  });
  const disablePushMutation = useMutation({
    mutationFn: disableBrowserPushSubscription,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['notifications', 'browser-push-subscriptions'],
      });
    },
  });
  const notificationReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
  const archiveMutation = useMutation({
    mutationFn: archiveNotification,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  if (notificationsQuery.isLoading) {
    return <LoadingState message="Loading notifications..." />;
  }

  if (notificationsQuery.isError || !notificationsQuery.data) {
    return (
      <ErrorState
        title="Unable to load notifications."
        onRetry={() => void notificationsQuery.refetch()}
      />
    );
  }

  const { unread, messages, reports, settings, deliveries } = notificationsQuery.data;

  return (
    <div className="space-y-6">
      <Panel title="Notification Center" subtitle="Unread messages and reports in one place.">
        <div className="grid gap-3 sm:grid-cols-3">
          <CounterCard label="Total Unread" value={unread.total} />
          <CounterCard label="Messages" value={unread.messages} />
          <CounterCard label="Reports" value={unread.reports} />
        </div>
      </Panel>

      <Panel
        title="Notification Settings"
        subtitle="Choose which reminders can reach you and through which channels."
        action={
          <Button
            variant="secondary"
            onClick={() => pushMutation.mutate()}
            disabled={pushMutation.isPending}
          >
            {pushMutation.isPending ? 'Connecting...' : 'Enable Browser Push'}
          </Button>
        }
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="space-y-3">
            {CHANNEL_SETTINGS.map((option) => (
              <ToggleRow
                key={option.key}
                label={option.label}
                help={option.help}
                checked={settings[option.key]}
                disabled={settingsMutation.isPending}
                onChange={(checked) => settingsMutation.mutate({ [option.key]: checked })}
              />
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {EVENT_SETTINGS.map((option) => (
              <label
                key={option.key}
                className="flex min-h-12 items-center gap-3 rounded-md border border-border bg-surface px-3 py-2 text-sm font-semibold text-text"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={settings[option.key]}
                  disabled={settingsMutation.isPending}
                  onChange={(event) =>
                    settingsMutation.mutate({ [option.key]: event.currentTarget.checked })
                  }
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </div>
        {settingsMutation.isError ? (
          <p className="mt-3 text-sm font-semibold text-danger">
            {(settingsMutation.error as Error).message}
          </p>
        ) : null}
        {pushMutation.isError ? (
          <p className="mt-3 text-sm font-semibold text-danger">
            {(pushMutation.error as Error).message}
          </p>
        ) : null}
        {pushSubscriptionsQuery.data?.subscriptions.length ? (
          <div className="mt-4 space-y-2">
            {pushSubscriptionsQuery.data.subscriptions.map((subscription) => (
              <div
                key={subscription.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2 text-sm"
              >
                <span className="min-w-0 flex-1 truncate font-semibold text-muted">
                  {subscription.endpoint}
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant={subscription.enabled ? 'success' : 'neutral'}>
                    {subscription.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                  {subscription.enabled ? (
                    <Button
                      variant="secondary"
                      className="px-3 py-1 text-xs"
                      disabled={disablePushMutation.isPending}
                      onClick={() => disablePushMutation.mutate(subscription.id)}
                    >
                      Disable
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </Panel>

      <Panel title="Recent Deliveries" subtitle="In-game, email, and browser push delivery state.">
        {deliveries.length === 0 ? (
          <p className="rounded border border-border bg-surface p-4 text-sm font-semibold text-muted">
            No notification deliveries yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {deliveries.slice(0, 8).map((delivery) => (
              <li key={delivery.id} className="rounded-md border border-border bg-surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-black text-text">{delivery.title}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="info">{delivery.channel.replace('_', ' ')}</Badge>
                    {delivery.readAt ? null : <Badge variant="warning">Unread</Badge>}
                    <Badge variant={delivery.status === 'failed' ? 'danger' : 'neutral'}>
                      {delivery.status}
                    </Badge>
                  </div>
                </div>
                <p className="mt-1 text-sm text-muted">{delivery.body}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {!delivery.readAt ? (
                    <Button
                      variant="secondary"
                      className="px-3 py-1 text-xs"
                      disabled={notificationReadMutation.isPending}
                      onClick={() => notificationReadMutation.mutate(delivery.id)}
                    >
                      Mark Read
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    className="px-3 py-1 text-xs"
                    disabled={archiveMutation.isPending}
                    onClick={() => archiveMutation.mutate(delivery.id)}
                  >
                    Archive
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title="Unread Messages"
        action={
          <Link to="/messages">
            <Button variant="secondary">Open Messages</Button>
          </Link>
        }
      >
        {messages.length === 0 ? (
          <p className="rounded border border-border bg-surface p-4 text-sm font-semibold text-muted">
            No recent messages.
          </p>
        ) : (
          <ul className="space-y-3">
            {messages.slice(0, 5).map((message) => (
              <li key={message.id} className="rounded-md border border-border bg-surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-black text-text">{message.subject}</p>
                  {!message.isRead ? <Badge variant="warning">Unread</Badge> : null}
                </div>
                <p className="mt-1 text-sm text-muted">
                  From {message.sender?.name ?? 'System'}: {message.bodyPreview}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title="Recent Reports"
        action={
          <Link to="/reports">
            <Button variant="secondary">Open Reports</Button>
          </Link>
        }
      >
        <ReportsList
          reports={reports.slice(0, 5)}
          pendingReportId={markReadMutation.isPending ? markReadMutation.variables : undefined}
          onMarkRead={(reportId) => markReadMutation.mutate(reportId)}
        />
      </Panel>
    </div>
  );
}

function ToggleRow({
  label,
  help,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  help: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-16 items-center justify-between gap-4 rounded-md border border-border bg-surface px-4 py-3">
      <span>
        <span className="block text-sm font-black text-text">{label}</span>
        <span className="block text-xs font-semibold text-muted">{help}</span>
      </span>
      <input
        type="checkbox"
        className="h-5 w-5 shrink-0 accent-primary"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
    </label>
  );
}

function CounterCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <p className="text-xs font-black uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 text-3xl font-black text-primary">{value}</p>
    </div>
  );
}

function urlBase64ToUint8Array(value: string): ArrayBuffer {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    output[index] = rawData.charCodeAt(index);
  }

  return output.buffer;
}
