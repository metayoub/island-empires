import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { requestEmailVerification } from '../../features/auth/auth.api';
import { BetaFeedbackButton } from '../../features/beta/BetaFeedbackButton';
import { useAuth } from '../../features/auth/useAuth';
import { getBootstrap, getCities, getCityOverview, selectCity } from '../../features/city/city.api';
import { getHealth } from '../../features/health/health.api';
import { useAppStore } from '../../stores/app.store';
import { ErrorState } from '../ui/ErrorState';
import { LoadingState } from '../ui/LoadingState';
import { LeftNavigation } from './LeftNavigation';
import { ResourceBar } from './ResourceBar';
import { RightPanel } from './RightPanel';
import { TopBar } from './TopBar';

export function GameShell() {
  const queryClient = useQueryClient();
  const authQuery = useAuth();
  const selectedCityId = useAppStore((state) => state.selectedCityId);
  const setSelectedCityId = useAppStore((state) => state.setSelectedCityId);
  const resendVerificationMutation = useMutation({ mutationFn: requestEmailVerification });

  const healthQuery = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
    refetchInterval: 15000,
    retry: 1,
  });

  const bootstrapQuery = useQuery({
    queryKey: ['bootstrap'],
    queryFn: getBootstrap,
    enabled: Boolean(authQuery.data),
    retry: 1,
  });

  useEffect(() => {
    if (!selectedCityId && bootstrapQuery.data?.selectedCityId) {
      setSelectedCityId(bootstrapQuery.data.selectedCityId);
    }
  }, [bootstrapQuery.data?.selectedCityId, selectedCityId, setSelectedCityId]);

  const citiesQuery = useQuery({
    queryKey: ['cities'],
    queryFn: getCities,
    enabled: Boolean(authQuery.data && bootstrapQuery.data),
    retry: 1,
  });

  const cityOverviewQuery = useQuery({
    queryKey: ['city-overview', selectedCityId],
    queryFn: () => getCityOverview(selectedCityId ?? ''),
    enabled: Boolean(selectedCityId),
    retry: 1,
    refetchInterval: (query) => (query.state.data?.activeConstruction ? 5000 : false),
  });

  function handleCityChange(cityId: string) {
    if (!cityId || cityId === selectedCityId) return;

    setSelectedCityId(cityId);
    void selectCity(cityId);
    void queryClient.invalidateQueries({ queryKey: ['reports'] });
    void queryClient.invalidateQueries({ queryKey: ['movements'] });
    void queryClient.invalidateQueries({ queryKey: ['world-map'] });
    void queryClient.invalidateQueries({ queryKey: ['island-detail'] });
  }

  if (authQuery.isLoading || bootstrapQuery.isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg p-6">
        <div className="w-full max-w-md">
          <LoadingState message="Opening Island Empires..." />
        </div>
      </main>
    );
  }

  if (authQuery.isError || !authQuery.data) {
    return <Navigate to="/login" replace />;
  }

  if (bootstrapQuery.isError || !bootstrapQuery.data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg p-6">
        <div className="w-full max-w-md">
          <ErrorState
            title="Unable to load your empire."
            onRetry={() => void bootstrapQuery.refetch()}
          />
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen text-text">
      <TopBar
        bootstrap={bootstrapQuery.data}
        apiOnline={healthQuery.data?.status === 'ok'}
        cities={citiesQuery.data ?? []}
        selectedCityId={selectedCityId}
        onCityChange={handleCityChange}
      />
      {bootstrapQuery.data.world.status === 'beta' ? (
        <div className="border-b border-primary/20 bg-primary/10 px-4 py-3 text-sm font-semibold text-text">
          <div className="mx-auto max-w-[1760px]">
            <strong>Beta World</strong>
            <span className="ml-2 text-text/80">
              This is a beta version of Island Empires. Some balance values may change before public launch.
            </span>
          </div>
        </div>
      ) : null}
      {!authQuery.data.user.emailVerified ? (
        <div className="border-b border-warning/30 bg-warning/15 px-4 py-3 text-sm font-semibold text-text">
          <div className="mx-auto flex max-w-[1760px] flex-wrap items-center justify-between gap-3">
            <span>Please verify your email address. Check your inbox or resend verification email.</span>
            <button
              className="rounded-md border border-warning/40 bg-surface px-3 py-1 font-bold text-primary"
              onClick={() => resendVerificationMutation.mutate()}
              disabled={resendVerificationMutation.isPending}
            >
              Resend verification email
            </button>
          </div>
        </div>
      ) : null}
      {cityOverviewQuery.data ? (
        <ResourceBar
          resources={cityOverviewQuery.data.resources}
          production={cityOverviewQuery.data.production}
          storage={cityOverviewQuery.data.storage}
        />
      ) : null}
      <div className="mx-auto grid max-w-[1760px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[210px_minmax(0,1fr)_300px]">
        <LeftNavigation />
        <div className="min-w-0">
          <Outlet />
        </div>
        <RightPanel />
      </div>
      {bootstrapQuery.data.world.status === 'beta' ? <BetaFeedbackButton /> : null}
    </div>
  );
}
