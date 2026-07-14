export function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#f4f1e8] px-6 py-10 text-stone-950">
      <article className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-800">
          Legal
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-normal">Privacy Policy</h1>
        <p className="mt-4 text-stone-700">Last updated July 12, 2026</p>
        <section className="mt-8 space-y-4 text-base leading-7 text-stone-800">
          <p className="font-semibold">
            Placeholder legal text. Review by a qualified legal professional before public launch.
          </p>
          <p>
            Island Empires collects account, gameplay, support, donation fulfillment, and
            security data needed to operate the game, protect players, and respond to abuse.
          </p>
          <p>
            We do not sell player personal data. Payment card details are handled by the
            payment provider and are not stored by Island Empires.
          </p>
          <p>
            Operational logs may include request IDs, player IDs, hashed IP addresses, browser
            metadata, and safe error context. Passwords, session tokens, private keys, and raw
            payment data must never be logged.
          </p>
          <p>
            Players can request account support, data correction, or deletion review through
            the support contact flow.
          </p>
          <p>
            Data categories include account identifiers, email, session cookies, notification
            preferences, gameplay activity, optional donations fulfilled by payment providers,
            logs, hashed anti-abuse signals, and support request metadata. Retention periods
            depend on security, legal, operational, and account-deletion requirements.
          </p>
        </section>
      </article>
    </main>
  );
}
