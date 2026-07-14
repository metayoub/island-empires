import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { SpyMissionType } from '@island-empires/shared-types';
import { Alert, Button, LoadingState, Modal } from '../../../components/ui';
import { getSpyMissionOptions, SPY_MISSION_LABELS, startSpyMission } from '../scouting.api';

const MISSION_TYPES: SpyMissionType[] = ['resource_report', 'army_report', 'building_report'];

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
}

export function SpyMissionModal({
  isOpen,
  originCityId,
  targetCityId,
  onClose,
}: {
  isOpen: boolean;
  originCityId: string | null;
  targetCityId: string | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [missionType, setMissionType] = useState<SpyMissionType>('resource_report');

  const optionsQuery = useQuery({
    queryKey: ['spy-options', originCityId, targetCityId],
    queryFn: () =>
      getSpyMissionOptions({ originCityId: originCityId ?? '', targetCityId: targetCityId ?? '' }),
    enabled: isOpen && Boolean(originCityId && targetCityId),
    retry: 1,
  });

  const startMutation = useMutation({
    mutationFn: () =>
      startSpyMission({
        originCityId: originCityId ?? '',
        targetCityId: targetCityId ?? '',
        missionType,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['spy-missions'] });
      void queryClient.invalidateQueries({ queryKey: ['spy-overview'] });
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
      onClose();
    },
  });

  const selectedOption = optionsQuery.data?.missions.find(
    (mission) => mission.missionType === missionType,
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Scout City">
      {optionsQuery.isPending ? <LoadingState message="Loading mission options..." /> : null}
      {optionsQuery.isError ? (
        <Alert variant="danger">{(optionsQuery.error as Error).message}</Alert>
      ) : null}
      {optionsQuery.data ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-border bg-surface/70 p-3">
              <p className="text-[11px] font-black uppercase tracking-wide text-muted">Origin</p>
              <p className="mt-1 text-sm font-black text-text">{optionsQuery.data.originCity.name}</p>
              <p className="text-xs font-semibold text-muted">
                Spy Agency Lv {optionsQuery.data.originCity.spyAgencyLevel} ·{' '}
                {optionsQuery.data.originCity.availableSpies} spies
              </p>
            </div>
            <div className="rounded-md border border-border bg-surface/70 p-3">
              <p className="text-[11px] font-black uppercase tracking-wide text-muted">Target</p>
              <p className="mt-1 text-sm font-black text-text">{optionsQuery.data.targetCity.name}</p>
              <p className="text-xs font-semibold text-muted">
                Governor: {optionsQuery.data.targetCity.playerName}
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {MISSION_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setMissionType(type)}
                className={`rounded-md border px-3 py-2 text-sm font-bold ${
                  missionType === type
                    ? 'border-primary bg-primary text-white'
                    : 'border-border bg-surface text-muted hover:text-text'
                }`}
              >
                {SPY_MISSION_LABELS[type]}
              </button>
            ))}
          </div>

          {selectedOption ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <InfoTile label="Success" value={formatPercent(selectedOption.successChance)} />
              <InfoTile label="Detection" value={formatPercent(selectedOption.detectionChance)} />
              <InfoTile label="Travel" value={formatDuration(selectedOption.travelTimeSeconds)} />
            </div>
          ) : null}

          {selectedOption?.disabledReason ? (
            <Alert variant="info">{selectedOption.disabledReason}</Alert>
          ) : null}
          {startMutation.isError ? (
            <Alert variant="danger">{(startMutation.error as Error).message}</Alert>
          ) : null}

          <Button
            className="w-full justify-center"
            disabled={!selectedOption?.canStart || startMutation.isPending}
            onClick={() => startMutation.mutate()}
          >
            {startMutation.isPending ? 'Sending spy...' : 'Send Spy'}
          </Button>
        </div>
      ) : null}
    </Modal>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-surface/70 px-3 py-3">
      <p className="text-[11px] font-black uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-base font-black text-text">{value}</p>
    </div>
  );
}
