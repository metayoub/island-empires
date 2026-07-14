import { FormEvent, useState } from 'react';
import { contactSupport, SupportCategory } from './support.api';

const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL ?? 'support@islandempires.local';
const categories: Array<{ value: SupportCategory; label: string }> = [
  { value: 'account', label: 'Account' },
  { value: 'payment', label: 'Payment' },
  { value: 'bug', label: 'Bug' },
  { value: 'gameplay', label: 'Gameplay' },
  { value: 'abuse_report', label: 'Abuse report' },
  { value: 'other', label: 'Other' },
];

export function SupportPage() {
  const [category, setCategory] = useState<SupportCategory>('bug');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setStatus('sending');
    try {
      await contactSupport({
        category,
        subject,
        message,
        playerId: playerId.trim() || undefined,
        userEmail: userEmail.trim() || undefined,
      });
      setStatus('sent');
      setSubject('');
      setMessage('');
    } catch {
      setStatus('failed');
    }
  };

  return (
    <main className="min-h-screen bg-[#f4f1e8] px-6 py-10 text-stone-950">
      <section className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-800">
          Support
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-normal">Contact Support</h1>
        <div className="mt-8 rounded border border-stone-300 bg-white p-5 shadow-sm">
          <p className="text-base leading-7 text-stone-800">
            Email{' '}
            <a className="font-semibold text-amber-900 underline" href={`mailto:${supportEmail}`}>
              {supportEmail}
            </a>{' '}
            with your account email, player name, approximate time of the issue, and a short
            description. For payment issues, include the receipt ID but do not send card details.
          </p>
        </div>
        <form className="mt-6 grid gap-4 rounded border border-stone-300 bg-white p-5 shadow-sm" onSubmit={onSubmit}>
          <label className="grid gap-2 text-sm font-semibold text-stone-800">
            Category
            <select
              className="rounded border border-stone-300 px-3 py-2 text-base font-normal"
              value={category}
              onChange={(event) => setCategory(event.target.value as SupportCategory)}
            >
              {categories.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-stone-800">
            Subject
            <input
              className="rounded border border-stone-300 px-3 py-2 text-base font-normal"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              minLength={3}
              maxLength={120}
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-stone-800">
            Message
            <textarea
              className="min-h-36 rounded border border-stone-300 px-3 py-2 text-base font-normal"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              minLength={10}
              maxLength={4000}
              required
            />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-stone-800">
              Player ID
              <input
                className="rounded border border-stone-300 px-3 py-2 text-base font-normal"
                value={playerId}
                onChange={(event) => setPlayerId(event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-stone-800">
              Email
              <input
                className="rounded border border-stone-300 px-3 py-2 text-base font-normal"
                type="email"
                value={userEmail}
                onChange={(event) => setUserEmail(event.target.value)}
              />
            </label>
          </div>
          <button
            className="w-fit rounded bg-amber-800 px-4 py-2 font-semibold text-white disabled:opacity-60"
            disabled={status === 'sending'}
            type="submit"
          >
            {status === 'sending' ? 'Sending...' : 'Send request'}
          </button>
          {status === 'sent' ? <p className="text-sm font-semibold text-emerald-700">Support request sent.</p> : null}
          {status === 'failed' ? <p className="text-sm font-semibold text-red-700">Support request could not be sent. Please try again later.</p> : null}
        </form>
      </section>
    </main>
  );
}
