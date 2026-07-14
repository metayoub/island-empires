import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  IslandDetailResponse,
  IslandSlotSummary,
  IslandSummary,
} from '@island-empires/shared-types';
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
  Panel,
} from '../../components/ui';
import { useAppStore } from '../../stores/app.store';
import marbleIcon from '../../assets/img/island/img_marble.jpg';
import wineIcon from '../../assets/img/island/img_wine.jpg';
import crystalIcon from '../../assets/img/island/img_glass.jpg';
import sulfurIcon from '../../assets/img/island/img_sulfur.jpg';
import { getBootstrap } from '../city/city.api';
import { ArmyMovementsPanel } from './components/ArmyMovementsPanel';
import { WorldMapScene } from './components/WorldMapScene';
import { getIslandDetail, getWorldMap, settleCity, triggerWorldMapOpened } from './map.api';

type WorldMapMode = 'island-selection' | 'city-slot-selection' | 'confirmation';

const RESOURCE_LABELS: Record<string, string> = {
  gold: 'Gold',
  wood: 'Wood',
  marble: 'Marble',
  wine: 'Wine',
  crystal: 'Crystal',
  sulfur: 'Sulfur',
};

const RESOURCE_ICONS: Record<string, string> = {
  marble: marbleIcon,
  wine: wineIcon,
  crystal: crystalIcon,
  sulfur: sulfurIcon,
};

function formatResource(resource: string): string {
  return RESOURCE_LABELS[resource] ?? resource;
}

function ResourceChip({ resource, label }: { resource: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-3 py-1.5 text-xs font-bold text-text shadow-sm">
      {RESOURCE_ICONS[resource] ? (
        <img
          src={RESOURCE_ICONS[resource]}
          alt=""
          className="h-6 w-6 rounded-sm"
          draggable={false}
        />
      ) : null}
      <span className="text-muted">{label}</span>
      {formatResource(resource)}
    </span>
  );
}

function formatTravelTime(seconds: number): string {
  if (seconds === 0) {
    return '0s';
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }

  return remainingSeconds === 0 ? `${minutes}m` : `${minutes}m ${remainingSeconds}s`;
}

const SLOT_LABELS = [
  'Capital Rise',
  'West Terrace',
  'East Terrace',
  'South Harbor',
  'North Coast',
  'Cliff Gate',
  'High Meadow',
  'Lookout Point',
  'Lagoon Gate',
  'Palm Strand',
  'East Dunes',
  'Barbarian Village',
];

function getSlotLabel(slotIndex: number): string {
  return SLOT_LABELS[slotIndex % SLOT_LABELS.length];
}

function getIslandBonus(resource: string): string {
  return `+10% ${formatResource(resource)} production`;
}

function getAvailableSlots(slots: IslandSlotSummary[]): number {
  return slots.filter((slot) => slot.status === 'empty').length;
}

function IslandDetailPanel({
  island,
  detail,
  isLoading,
  isError,
  mode,
  selectedSlotIndex,
  onRetry,
  onChooseIsland,
  onSelectSlot,
}: {
  island: IslandSummary | null;
  detail?: IslandDetailResponse | null;
  isLoading: boolean;
  isError: boolean;
  mode: WorldMapMode;
  selectedSlotIndex: number | null;
  onRetry: () => void;
  onChooseIsland: () => void;
  onSelectSlot: (slotIndex: number) => void;
}) {
  if (!island) {
    return (
      <EmptyState title="Select an island" description="Choose an island to inspect city slots." />
    );
  }

  if (isLoading) {
    return <LoadingState message="Loading island details..." />;
  }

  if (isError || !detail) {
    return <ErrorState title="Unable to load island details." onRetry={onRetry} />;
  }

  const occupiedSlots = detail.slots.filter((slot) => slot.status !== 'empty').length;
  const availableSlots = getAvailableSlots(detail.slots);
  const slotPercent =
    detail.island.maxSlots > 0 ? Math.min(100, (occupiedSlots / detail.island.maxSlots) * 100) : 0;

  return (
    <Panel
      title={detail.island.name}
      subtitle={`Coordinates ${detail.island.x}:${detail.island.y}`}
      action={
        <Badge variant={availableSlots > 0 ? 'success' : 'warning'}>
          {availableSlots > 0 ? 'Available' : 'Full'}
        </Badge>
      }
    >
      <div className="rounded-lg border border-border bg-surface/70 p-4 shadow-inner">
        <div className="flex flex-wrap gap-2">
          <ResourceChip resource={detail.island.luxuryResource} label="Luxury" />
          <span className="inline-flex items-center rounded-full border border-border bg-surface/80 px-3 py-1.5 text-xs font-bold text-muted shadow-sm">
            Travel {formatTravelTime(detail.travelTimeSeconds)}
          </span>
        </div>
        <p className="mt-3 rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm font-bold text-primary">
          Luxury deposit: {formatResource(detail.island.luxuryResource)}
        </p>
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs font-bold text-muted">
            <span>City Slots</span>
            <span>
              {availableSlots} available / {detail.island.maxSlots} total
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-strong shadow-inner">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${slotPercent}%` }}
            />
          </div>
        </div>
      </div>

      {mode === 'city-slot-selection' ? (
        <Alert variant="info">
          Choose an available city slot on the island map or from the list below.
        </Alert>
      ) : null}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-black text-text">City Slots</h3>
          {mode !== 'city-slot-selection' ? (
            <Button
              variant="secondary"
              onClick={onChooseIsland}
              disabled={availableSlots === 0}
              className="px-3 py-1.5 text-xs"
            >
              Choose this island
            </Button>
          ) : null}
        </div>
        {detail.slots.map((slot) => (
          <button
            type="button"
            key={slot.slotIndex}
            onClick={() => {
              if (mode === 'city-slot-selection' && slot.status === 'empty') {
                onSelectSlot(slot.slotIndex);
              }
            }}
            disabled={mode !== 'city-slot-selection' || slot.status !== 'empty'}
            className={`flex w-full items-center justify-between gap-3 rounded-md border p-3 text-left text-sm shadow-sm transition-all ${
              selectedSlotIndex === slot.slotIndex
                ? 'border-secondary bg-secondary/10 ring-2 ring-secondary/30'
                : 'border-border bg-surface/75 hover:bg-surface'
            } ${mode === 'city-slot-selection' && slot.status === 'empty' ? 'cursor-pointer hover:-translate-y-0.5' : 'cursor-default'}`}
          >
            <div>
              <p className="font-bold">
                Slot {slot.slotIndex} · {getSlotLabel(slot.slotIndex)}
              </p>
              {slot.barbarianVillage ? (
                <p className="text-muted">
                  Level {slot.barbarianVillage.level} · Barbarian Village
                </p>
              ) : slot.city ? (
                <p className="text-muted">
                  {slot.city.name} · Level {slot.city.level} · {slot.city.playerName}
                </p>
              ) : (
                <p className="text-muted">Available city location</p>
              )}
            </div>
            {slot.barbarianVillage ? (
              <Badge variant="danger">Village</Badge>
            ) : slot.city?.isOwnedByCurrentPlayer ? (
              <Badge variant="info">Your City</Badge>
            ) : slot.city ? (
              <Badge variant="neutral">Occupied</Badge>
            ) : selectedSlotIndex === slot.slotIndex ? (
              <Badge variant="warning">Selected</Badge>
            ) : (
              <Badge variant="success">Available</Badge>
            )}
          </button>
        ))}
      </div>
    </Panel>
  );
}

function MapLegend() {
  return (
    <Panel title="Legend" subtitle="Illustrated map markers">
      <div className="grid gap-2 text-sm text-muted sm:grid-cols-2 lg:grid-cols-1">
        <span>
          <strong className="text-primary">Your City</strong> marks your current city island.
        </span>
        <span>
          <strong className="text-warning">Full</strong> means all city slots are occupied.
        </span>
        <span>All islands are selectable; use the compass to navigate the wider ocean.</span>
        <span>The compass moves across the larger ocean map.</span>
        <span>Open an island to see city slots and the Barbarian Village.</span>
      </div>
    </Panel>
  );
}

export function WorldMapPage() {
  const navigate = useNavigate();
  const setSelectedCityId = useAppStore((state) => state.setSelectedCityId);
  const [selectedIslandId, setSelectedIslandId] = useState<string | null>(null);
  const [mode, setMode] = useState<WorldMapMode>('island-selection');
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [mapCenterRequestKey, setMapCenterRequestKey] = useState(0);

  const bootstrapQuery = useQuery({
    queryKey: ['bootstrap'],
    queryFn: getBootstrap,
    retry: 1,
  });

  const worldMapQuery = useQuery({
    queryKey: ['world-map', bootstrapQuery.data?.world.id],
    queryFn: () => getWorldMap(bootstrapQuery.data?.world.id ?? ''),
    enabled: Boolean(bootstrapQuery.data?.world.id),
    retry: 1,
  });

  const triggerMutation = useMutation({
    mutationFn: triggerWorldMapOpened,
  });

  const selectedIsland =
    worldMapQuery.data?.islands.find((island) => island.id === selectedIslandId) ?? null;

  const islandDetailQuery = useQuery({
    queryKey: ['island-detail', selectedIslandId],
    queryFn: () => getIslandDetail(selectedIslandId ?? ''),
    enabled: Boolean(selectedIslandId),
    retry: 1,
  });

  const settleMutation = useMutation({
    mutationFn: ({ islandId, slotIndex }: { islandId: string; slotIndex: number }) =>
      settleCity(islandId, slotIndex),
    onSuccess: (response) => {
      setSelectedCityId(response.city.id);
      void worldMapQuery.refetch();
      void islandDetailQuery.refetch();
      navigate('/');
    },
  });

  useEffect(() => {
    if (worldMapQuery.data && !selectedIslandId) {
      setSelectedIslandId(
        worldMapQuery.data.islands.find((island) => island.hasPlayerCity)?.id ??
          worldMapQuery.data.islands[0]?.id ??
          null,
      );
    }
  }, [selectedIslandId, worldMapQuery.data]);

  useEffect(() => {
    setMode('island-selection');
    setSelectedSlotIndex(null);
  }, [selectedIslandId]);

  useEffect(() => {
    if (worldMapQuery.data && triggerMutation.isIdle) {
      triggerMutation.mutate();
    }
  }, [triggerMutation, worldMapQuery.data]);

  if (bootstrapQuery.isLoading || worldMapQuery.isLoading) {
    return <LoadingState message="Loading world map..." />;
  }

  if (bootstrapQuery.isError || worldMapQuery.isError || !worldMapQuery.data) {
    return (
      <ErrorState title="Unable to load world map." onRetry={() => void worldMapQuery.refetch()} />
    );
  }

  if (worldMapQuery.data.islands.length === 0) {
    return (
      <EmptyState title="No islands found." description="The world map may not be generated yet." />
    );
  }

  const playerIsland = worldMapQuery.data.islands.find((island) => island.hasPlayerCity);
  const selectedSlot =
    islandDetailQuery.data?.slots.find((slot) => slot.slotIndex === selectedSlotIndex) ?? null;

  function handleChooseIsland() {
    if (!islandDetailQuery.data || getAvailableSlots(islandDetailQuery.data.slots) === 0) {
      return;
    }

    setMode('city-slot-selection');
    setSelectedSlotIndex(null);
  }

  function handleSelectSlot(slotIndex: number) {
    const slot = islandDetailQuery.data?.slots.find(
      (candidate) => candidate.slotIndex === slotIndex,
    );
    if (!slot || slot.status !== 'empty') {
      return;
    }

    setSelectedSlotIndex(slotIndex);
    setMode('confirmation');
  }

  function handleCancelPlacement() {
    setSelectedSlotIndex(null);
    setMode('city-slot-selection');
  }

  function handleConfirmPlacement() {
    if (!selectedIslandId || selectedSlotIndex === null) {
      return;
    }

    settleMutation.mutate({ islandId: selectedIslandId, slotIndex: selectedSlotIndex });
  }

  return (
    <div className="space-y-6">
      <Panel
        title="World Map"
        subtitle={`${worldMapQuery.data.world.name} · ${worldMapQuery.data.islands.length} island archipelago`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                if (playerIsland) {
                  setSelectedIslandId(playerIsland.id);
                  setMapCenterRequestKey((current) => current + 1);
                }
              }}
              disabled={!playerIsland}
            >
              Center on My City
            </Button>
            <Button variant="ghost" disabled>
              Search
            </Button>
          </div>
        }
      >
        <WorldMapScene
          islands={worldMapQuery.data.islands}
          width={worldMapQuery.data.map.width}
          height={worldMapQuery.data.map.height}
          selectedIslandId={selectedIslandId}
          centerRequestKey={mapCenterRequestKey}
          onSelectIsland={(islandId) => {
            setSelectedIslandId(islandId);
            navigate(`/map/islands/${islandId}`);
          }}
        />
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <IslandDetailPanel
          island={selectedIsland}
          detail={islandDetailQuery.data}
          isLoading={islandDetailQuery.isLoading}
          isError={islandDetailQuery.isError}
          mode={mode}
          selectedSlotIndex={selectedSlotIndex}
          onRetry={() => void islandDetailQuery.refetch()}
          onChooseIsland={handleChooseIsland}
          onSelectSlot={handleSelectSlot}
        />
        <MapLegend />
      </div>

      <ArmyMovementsPanel />

      <Modal
        isOpen={mode === 'confirmation' && Boolean(selectedIsland && selectedSlot)}
        onClose={handleCancelPlacement}
        title="Found New City"
      >
        {selectedIsland && selectedSlot ? (
          <div className="space-y-4">
            <div className="rounded-md border border-border bg-surface/70 p-3">
              <dl className="grid gap-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="font-bold text-muted">Island</dt>
                  <dd className="font-black text-text">{selectedIsland.name}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="font-bold text-muted">Location</dt>
                  <dd className="font-black text-text">{getSlotLabel(selectedSlot.slotIndex)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="font-bold text-muted">Main Resource</dt>
                  <dd className="font-black text-text">
                    {formatResource(selectedIsland.mainResource)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="font-bold text-muted">Starting Bonus</dt>
                  <dd className="font-black text-primary">
                    {getIslandBonus(selectedIsland.mainResource)}
                  </dd>
                </div>
              </dl>
            </div>
            <p className="text-sm font-semibold text-muted">
              Are you sure you want to settle here?
            </p>
            {settleMutation.isError ? (
              <Alert variant="danger">{settleMutation.error.message}</Alert>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={handleCancelPlacement}
                disabled={settleMutation.isPending}
              >
                Cancel
              </Button>
              <Button onClick={handleConfirmPlacement} disabled={settleMutation.isPending}>
                {settleMutation.isPending ? 'Founding...' : 'Confirm City'}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
