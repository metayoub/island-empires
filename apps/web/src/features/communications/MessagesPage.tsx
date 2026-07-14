import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MessageDetail, MessageSummary } from '@island-empires/shared-types';
import { FormEvent, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Button, ErrorState, LoadingState, Panel } from '../../components/ui';
import { getBootstrap } from '../city/city.api';
import {
  blockPlayer,
  getInbox,
  getModerationQueue,
  getSentMessages,
  getSystemMessages,
  markMessageRead,
  reportMessage,
  searchPlayers,
  sendMessage,
} from './communications.api';
import { MessageList } from './components/MessageList';

type MessageTab = 'inbox' | 'sent' | 'system' | 'moderation';

const TAB_LABELS: Record<MessageTab, string> = {
  inbox: 'Inbox',
  sent: 'Sent',
  system: 'System',
  moderation: 'Moderation',
};

const inputClassName =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm font-semibold text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20';

export function MessagesPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const initialRecipientName = searchParams.get('recipientName') ?? '';
  const [tab, setTab] = useState<MessageTab>('inbox');
  const [selectedMessage, setSelectedMessage] = useState<MessageDetail | MessageSummary | null>(
    null,
  );
  const [recipientQuery, setRecipientQuery] = useState(initialRecipientName);
  const [recipientPlayerId, setRecipientPlayerId] = useState(
    searchParams.get('recipientPlayerId') ?? '',
  );
  const [recipientName, setRecipientName] = useState(initialRecipientName);
  const [subject, setSubject] = useState(searchParams.get('subject') ?? '');
  const [body, setBody] = useState('');
  const [reportReasonByMessageId, setReportReasonByMessageId] = useState<Record<string, string>>(
    {},
  );
  const [blockReasonByPlayerId, setBlockReasonByPlayerId] = useState<Record<string, string>>({});

  const bootstrapQuery = useQuery({
    queryKey: ['bootstrap'],
    queryFn: getBootstrap,
    retry: 1,
  });
  const inboxQuery = useQuery({
    queryKey: ['messages', 'inbox'],
    queryFn: getInbox,
    retry: 1,
    refetchInterval: 15000,
  });
  const sentQuery = useQuery({
    queryKey: ['messages', 'sent'],
    queryFn: getSentMessages,
    retry: 1,
    refetchInterval: 15000,
  });
  const systemQuery = useQuery({
    queryKey: ['messages', 'system'],
    queryFn: getSystemMessages,
    retry: 1,
    refetchInterval: 15000,
  });
  const moderationQuery = useQuery({
    queryKey: ['moderation', 'messages'],
    queryFn: getModerationQueue,
    retry: 1,
    enabled: tab === 'moderation',
  });
  const playerSearchQuery = useQuery({
    queryKey: ['players', 'search', bootstrapQuery.data?.world.id, recipientQuery],
    queryFn: () => searchPlayers(bootstrapQuery.data?.world.id ?? '', recipientQuery),
    enabled: Boolean(bootstrapQuery.data?.world.id && recipientQuery.trim().length >= 2),
    retry: 1,
  });

  const selectedRecipient = playerSearchQuery.data?.players.find(
    (player) => player.id === recipientPlayerId,
  );
  const selectedRecipientName = selectedRecipient?.name ?? recipientName;

  const sendMutation = useMutation({
    mutationFn: () => sendMessage({ recipientPlayerId, subject, body }),
    onSuccess: () => {
      setSubject('');
      setBody('');
      setRecipientPlayerId('');
      setRecipientName('');
      void queryClient.invalidateQueries({ queryKey: ['messages'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const readMutation = useMutation({
    mutationFn: markMessageRead,
    onSuccess: (message) => {
      setSelectedMessage(message);
      void queryClient.invalidateQueries({ queryKey: ['messages', 'inbox'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const reportMutation = useMutation({
    mutationFn: (input: { messageId: string; reason: string }) =>
      reportMessage(input.messageId, { reason: input.reason }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['moderation', 'messages'] });
    },
  });

  const blockMutation = useMutation({
    mutationFn: (input: { playerId: string; reason?: string }) =>
      blockPlayer(input.playerId, { reason: input.reason }),
  });

  const messages = useMemo(() => {
    if (tab === 'sent') return sentQuery.data?.messages ?? [];
    if (tab === 'system') return systemQuery.data?.messages ?? [];
    return inboxQuery.data?.messages ?? [];
  }, [inboxQuery.data?.messages, sentQuery.data?.messages, systemQuery.data?.messages, tab]);

  function handleSelectMessage(message: MessageSummary) {
    setSelectedMessage(message);
    if (tab === 'inbox') {
      readMutation.mutate(message.id);
    }
  }

  function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendMutation.mutate();
  }

  function handleReport(message: MessageSummary) {
    const reason = reportReasonByMessageId[message.id]?.trim() || 'Needs moderation review';
    reportMutation.mutate({ messageId: message.id, reason });
  }

  function handleBlock(playerId: string) {
    const reason = blockReasonByPlayerId[playerId]?.trim();
    blockMutation.mutate({ playerId, reason });
  }

  const listQuery = tab === 'sent' ? sentQuery : tab === 'system' ? systemQuery : inboxQuery;

  if (bootstrapQuery.isLoading) {
    return <LoadingState message="Opening messages..." />;
  }

  if (bootstrapQuery.isError || !bootstrapQuery.data) {
    return (
      <ErrorState title="Unable to load messaging." onRetry={() => void bootstrapQuery.refetch()} />
    );
  }

  return (
    <div className="space-y-6">
      <Panel title="Messages" subtitle="Read, send, report, and block player messages.">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(TAB_LABELS) as MessageTab[]).map((item) => (
            <Button
              key={item}
              variant={tab === item ? 'primary' : 'secondary'}
              onClick={() => {
                setTab(item);
                setSelectedMessage(null);
              }}
            >
              {TAB_LABELS[item]}
            </Button>
          ))}
        </div>

        {tab !== 'moderation' ? (
          <>
            {listQuery.isLoading ? <LoadingState message="Loading messages..." /> : null}
            {listQuery.isError ? (
              <ErrorState
                title="Unable to load messages."
                onRetry={() => void listQuery.refetch()}
              />
            ) : null}
            {!listQuery.isLoading && !listQuery.isError ? (
              <MessageList
                messages={messages}
                selectedMessage={selectedMessage}
                pendingMessageId={readMutation.isPending ? readMutation.variables : undefined}
                onSelect={handleSelectMessage}
                onReport={
                  tab === 'inbox'
                    ? (message) => {
                        if (!reportReasonByMessageId[message.id]) {
                          setReportReasonByMessageId((current) => ({
                            ...current,
                            [message.id]: 'Needs moderation review',
                          }));
                        }
                        handleReport(message);
                      }
                    : undefined
                }
                onBlock={tab === 'inbox' ? handleBlock : undefined}
              />
            ) : null}
            {selectedMessage?.sender && tab === 'inbox' ? (
              <div className="grid gap-3 rounded-md border border-border bg-surface p-4 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs font-black uppercase tracking-wide text-muted">
                    Report reason
                  </span>
                  <input
                    className={inputClassName}
                    value={reportReasonByMessageId[selectedMessage.id] ?? ''}
                    onChange={(event) =>
                      setReportReasonByMessageId((current) => ({
                        ...current,
                        [selectedMessage.id]: event.target.value,
                      }))
                    }
                    placeholder="Spam, harassment, exploit attempt..."
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-black uppercase tracking-wide text-muted">
                    Block reason
                  </span>
                  <input
                    className={inputClassName}
                    value={blockReasonByPlayerId[selectedMessage.sender.id] ?? ''}
                    onChange={(event) =>
                      setBlockReasonByPlayerId((current) => ({
                        ...current,
                        [selectedMessage.sender!.id]: event.target.value,
                      }))
                    }
                    placeholder="Optional"
                  />
                </label>
              </div>
            ) : null}
          </>
        ) : (
          <div className="space-y-3">
            {moderationQuery.isLoading ? (
              <LoadingState message="Loading moderation queue..." />
            ) : null}
            {moderationQuery.isError ? (
              <ErrorState
                title="Unable to load moderation queue."
                onRetry={() => void moderationQuery.refetch()}
              />
            ) : null}
            {moderationQuery.data?.queue.length === 0 ? (
              <Alert variant="success">No pending message reports.</Alert>
            ) : null}
            {moderationQuery.data?.queue.map((item) => (
              <div key={item.id} className="rounded-md border border-border bg-surface p-4">
                <p className="text-sm font-black text-text">Message {item.messageId}</p>
                <p className="mt-1 text-sm text-muted">
                  Reported by {item.reporterPlayerName}: {item.reason}
                </p>
                <p className="mt-2 text-xs font-bold uppercase text-warning">{item.status}</p>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Compose Message" subtitle="Search a world player, then send a direct message.">
        <form className="space-y-4" onSubmit={handleSend}>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <label className="space-y-1">
              <span className="text-xs font-black uppercase tracking-wide text-muted">
                Find Player
              </span>
              <input
                className={inputClassName}
                value={recipientQuery}
                onChange={(event) => {
                  setRecipientQuery(event.target.value);
                  setRecipientPlayerId('');
                  setRecipientName('');
                }}
                placeholder="Search by player name"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-black uppercase tracking-wide text-muted">
                Recipient
              </span>
              <select
                className={inputClassName}
                value={recipientPlayerId}
                onChange={(event) => {
                  const player = playerSearchQuery.data?.players.find(
                    (candidate) => candidate.id === event.target.value,
                  );
                  setRecipientPlayerId(event.target.value);
                  setRecipientName(player?.name ?? '');
                }}
                disabled={!playerSearchQuery.data?.players.length && !recipientPlayerId}
                required
              >
                <option value="">Select a player</option>
                {recipientPlayerId && !selectedRecipient ? (
                  <option value={recipientPlayerId}>
                    {selectedRecipientName || 'Selected player'}
                  </option>
                ) : null}
                {playerSearchQuery.data?.players
                  .filter((player) => player.id !== bootstrapQuery.data.player.id)
                  .map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name} · Score {player.score}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          {recipientPlayerId ? (
            <Alert variant="info">
              Sending to {selectedRecipientName || 'selected player'}
              {selectedRecipient
                ? `. Cities: ${selectedRecipient.cityCount}, population: ${selectedRecipient.population}`
                : '.'}
            </Alert>
          ) : null}
          <label className="space-y-1">
            <span className="text-xs font-black uppercase tracking-wide text-muted">Subject</span>
            <input
              className={inputClassName}
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              maxLength={80}
              required
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-black uppercase tracking-wide text-muted">Message</span>
            <textarea
              className={`${inputClassName} min-h-36 resize-y leading-6`}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={2000}
              required
            />
          </label>
          {sendMutation.isError ? (
            <Alert variant="danger">{sendMutation.error.message}</Alert>
          ) : null}
          {sendMutation.isSuccess ? <Alert variant="success">Message sent.</Alert> : null}
          {reportMutation.isError ? (
            <Alert variant="danger">{reportMutation.error.message}</Alert>
          ) : null}
          {reportMutation.isSuccess ? <Alert variant="success">Message reported.</Alert> : null}
          {blockMutation.isError ? (
            <Alert variant="danger">{blockMutation.error.message}</Alert>
          ) : null}
          {blockMutation.isSuccess ? <Alert variant="success">Player blocked.</Alert> : null}
          <Button type="submit" disabled={!recipientPlayerId || sendMutation.isPending}>
            Send Message
          </Button>
        </form>
      </Panel>
    </div>
  );
}
