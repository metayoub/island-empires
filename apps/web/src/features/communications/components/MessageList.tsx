import type { MessageDetail, MessageSummary } from '@island-empires/shared-types';
import { Badge, Button, EmptyState } from '../../../components/ui';

type MessageListProps = {
  messages: MessageSummary[];
  selectedMessage: MessageDetail | MessageSummary | null;
  pendingMessageId?: string;
  onSelect: (message: MessageSummary) => void;
  onReport?: (message: MessageSummary) => void;
  onBlock?: (playerId: string) => void;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function MessageList({
  messages,
  selectedMessage,
  pendingMessageId,
  onSelect,
  onReport,
  onBlock,
}: MessageListProps) {
  if (messages.length === 0) {
    return (
      <EmptyState title="No messages" description="Player and system messages will appear here." />
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <ul className="space-y-2">
        {messages.map((message) => {
          const isSelected = selectedMessage?.id === message.id;
          const senderLabel = message.sender?.name ?? 'System';

          return (
            <li key={message.id}>
              <button
                type="button"
                className={`w-full rounded-md border p-3 text-left transition ${
                  isSelected
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-surface hover:border-primary/50 hover:bg-surface-strong/70'
                }`}
                onClick={() => onSelect(message)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-text">{message.subject}</p>
                    <p className="mt-1 text-xs font-semibold text-muted">
                      {senderLabel} · {formatDate(message.createdAt)}
                    </p>
                  </div>
                  {!message.isRead ? <Badge variant="warning">Unread</Badge> : null}
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-muted">{message.bodyPreview}</p>
                {pendingMessageId === message.id ? (
                  <p className="mt-2 text-xs font-bold text-primary">Opening...</p>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="rounded-md border border-border bg-surface p-4">
        {!selectedMessage ? (
          <EmptyState title="Select a message" description="Open a message to read details." />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-muted">
                  {selectedMessage.messageType === 'system' ? 'System Message' : 'Player Message'}
                </p>
                <h2 className="mt-1 text-xl font-black text-text">{selectedMessage.subject}</h2>
                <p className="text-sm font-semibold text-muted">
                  From {selectedMessage.sender?.name ?? 'System'} to{' '}
                  {selectedMessage.recipient.name}
                </p>
              </div>
              {!selectedMessage.isRead ? <Badge variant="warning">Unread</Badge> : null}
            </div>
            <div className="rounded border border-border bg-white/45 p-4 text-sm leading-6 text-text">
              {'body' in selectedMessage ? selectedMessage.body : selectedMessage.bodyPreview}
            </div>
            {selectedMessage.sender ? (
              <div className="flex flex-wrap gap-2">
                {onReport ? (
                  <Button variant="secondary" onClick={() => onReport(selectedMessage)}>
                    Report Message
                  </Button>
                ) : null}
                {onBlock ? (
                  <Button variant="danger" onClick={() => onBlock(selectedMessage.sender!.id)}>
                    Block Player
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
