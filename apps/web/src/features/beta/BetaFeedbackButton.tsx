import { useMutation } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { submitBetaFeedback, type BetaFeedbackCategory } from './beta.api';

const categories: Array<{ value: BetaFeedbackCategory; label: string }> = [
  { value: 'bug', label: 'Bug' },
  { value: 'confusing', label: 'Confusing' },
  { value: 'balance', label: 'Balance' },
  { value: 'suggestion', label: 'Suggestion' },
  { value: 'performance', label: 'Performance' },
  { value: 'positive', label: 'Positive' },
  { value: 'other', label: 'Other' },
];

export function BetaFeedbackButton() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<BetaFeedbackCategory>('bug');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const mutation = useMutation({
    mutationFn: submitBetaFeedback,
    onSuccess: () => {
      setSuccess(true);
      setTitle('');
      setMessage('');
    },
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate({
      category,
      title,
      message,
      page: `${location.pathname}${location.search}`,
    });
  }

  return (
    <>
      <button
        className="fixed bottom-5 right-5 z-40 rounded-md border border-primary/30 bg-primary px-4 py-2 text-sm font-black text-white shadow-lg transition hover:bg-primary/90"
        type="button"
        onClick={() => {
          setIsOpen(true);
          setSuccess(false);
        }}
      >
        Send Feedback
      </button>
      <Modal isOpen={isOpen} title="Beta Feedback" onClose={() => setIsOpen(false)}>
        <form className="space-y-4" onSubmit={submit}>
          {success ? (
            <div className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm font-semibold text-text">
              Thank you. Your feedback helps improve Island Empires.
            </div>
          ) : null}
          {mutation.error ? (
            <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">
              {mutation.error instanceof Error ? mutation.error.message : 'Unable to submit feedback.'}
            </div>
          ) : null}
          <label className="block text-sm font-bold text-text">
            Category
            <select
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm font-semibold text-text"
              value={category}
              onChange={(event) => setCategory(event.target.value as BetaFeedbackCategory)}
            >
              {categories.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-bold text-text">
            Title
            <input
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm font-semibold text-text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
              required
            />
          </label>
          <label className="block text-sm font-bold text-text">
            Message
            <textarea
              className="mt-1 min-h-[140px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm font-semibold text-text"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={3000}
              required
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setIsOpen(false)}>Close</Button>
            <Button type="submit" disabled={mutation.isPending}>Submit</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
