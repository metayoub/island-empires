import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

type AuthLayoutProps = {
  title: string;
  children: ReactNode;
};

export function AuthLayout({ title, children }: AuthLayoutProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 py-10 text-text">
      <section className="game-surface game-frame w-full max-w-md rounded-lg p-6">
        <Link to="/" className="text-sm font-black uppercase tracking-wide text-primary">
          Island Empires
        </Link>
        <h1 className="mt-3 text-2xl font-black">{title}</h1>
        <div className="mt-6">{children}</div>
      </section>
    </main>
  );
}
