type StatusPageProps = {
  title: string;
  message: string;
};

function StatusPage({ title, message }: StatusPageProps) {
  return (
    <main className="min-h-screen bg-[#f4f1e8] px-6 py-12 text-stone-950">
      <section className="mx-auto max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-800">
          Island Empires
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-normal">{title}</h1>
        <p className="mt-5 text-lg leading-8 text-stone-800">{message}</p>
      </section>
    </main>
  );
}

export function NotFoundPage() {
  return <StatusPage title="Page Not Found" message="The page you requested does not exist." />;
}

export function ServerErrorPage() {
  return (
    <StatusPage
      title="Server Error"
      message="Service temporarily unavailable. Please try again shortly."
    />
  );
}

export function MaintenancePage() {
  return (
    <StatusPage
      title="Maintenance"
      message="Island Empires is currently under maintenance. Please come back soon."
    />
  );
}

export function ConnectionLostPage() {
  return (
    <StatusPage
      title="Connection Lost"
      message="The game could not reach the server. Check your connection and retry."
    />
  );
}

export function SessionExpiredPage() {
  return (
    <StatusPage
      title="Session Expired"
      message="Your session has expired. Log in again to continue playing."
    />
  );
}

export function AccessDeniedPage() {
  return (
    <StatusPage
      title="Access Denied"
      message="Your account does not have access to this page."
    />
  );
}
