import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { IslandSlotSummary } from '@island-empires/shared-types';
import islandViewBackground from '../../assets/img/island/0.png';
import barbarianVillageArt from '../../assets/img/island/generated/barbarian_village.png';
import cityArt from '../../assets/img/island/generated/city.png';
import crystalMineArt from '../../assets/img/island/generated/crystal_mine.png';
import emptyCitySpotArt from '../../assets/img/island/generated/empty_city_spot.png';
import marbleQuarryArt from '../../assets/img/island/generated/marble_quarry.png';
import sulfurPitArt from '../../assets/img/island/generated/sulfur_pit.png';
import vineyardArt from '../../assets/img/island/generated/vineyard.png';
import woodGroveArt from '../../assets/img/island/generated/wood_grove.png';
import marbleIcon from '../../assets/img/island/img_marble.jpg';
import wineIcon from '../../assets/img/island/img_wine.jpg';
import crystalIcon from '../../assets/img/island/img_glass.jpg';
import sulfurIcon from '../../assets/img/island/img_sulfur.jpg';
import { Alert, Badge, Button, ErrorState, LoadingState, Modal } from '../../components/ui';
import { useAppStore } from '../../stores/app.store';
import { assignWorkers } from '../city/city.api';
import { SpyMissionModal } from '../scouting/components/SpyMissionModal';
import { NavalAttackModal } from './components/NavalAttackModal';
import { PveCampDetailPanel } from './components/PveCampDetailPanel';
import { PvpAttackModal } from './components/PvpAttackModal';
import { getIslandDetail, settleCity } from './map.api';

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

type ResourceSiteKind = 'wood' | 'marble' | 'wine' | 'crystal' | 'sulfur';

type IslandActionDialog =
  { type: 'resource'; resource: ResourceSiteKind } | { type: 'slot'; slot: IslandSlotSummary };

type OwnedIslandCity = NonNullable<IslandSlotSummary['city']> & {
  population: NonNullable<NonNullable<IslandSlotSummary['city']>['population']>;
  workers: NonNullable<NonNullable<IslandSlotSummary['city']>['workers']>;
};

const RESOURCE_SITE_ART: Record<ResourceSiteKind, string> = {
  wood: woodGroveArt,
  marble: marbleQuarryArt,
  wine: vineyardArt,
  crystal: crystalMineArt,
  sulfur: sulfurPitArt,
};

const RESOURCE_SITE_BUILDINGS: Record<ResourceSiteKind, string> = {
  wood: 'Woods',
  marble: 'Marble Quarry',
  wine: 'Vineyard',
  crystal: 'Crystal Mine',
  sulfur: 'Sulfur Pit',
};

const RESOURCE_SITE_POSITIONS: Record<'wood' | 'luxury', { x: number; y: number }> = {
  wood: { x: 36, y: 40 },
  luxury: { x: 58, y: 39 },
};

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

const SLOT_POSITIONS: Array<{ x: number; y: number }> = [
  { x: 15, y: 43 },
  { x: 26, y: 30 },
  { x: 68, y: 24 },
  { x: 78, y: 52 },
  { x: 25, y: 54 },
  { x: 36, y: 85 },
  { x: 52, y: 79 },
  { x: 63, y: 83 },
  { x: 37, y: 17 },
  { x: 15, y: 17 },
  { x: 52, y: 15 },
  { x: 75, y: 67 },
];

function formatResource(resource: string): string {
  return RESOURCE_LABELS[resource] ?? resource;
}

function getSlotLabel(slotIndex: number): string {
  return SLOT_LABELS[slotIndex % SLOT_LABELS.length];
}

function getIslandBonus(resource: string): string {
  return `+10% ${formatResource(resource)} production`;
}

function isResourceSiteKind(resource: string): resource is ResourceSiteKind {
  return resource in RESOURCE_SITE_ART;
}

function getOwnedIslandCities(slots: IslandSlotSummary[]): OwnedIslandCity[] {
  return slots
    .map((slot) => slot.city)
    .filter((city): city is OwnedIslandCity =>
      Boolean(city?.isOwnedByCurrentPlayer && city.population && city.workers),
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

function ResourceChip({ resource, label }: { resource: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[#d6b982] bg-[#fff8e9]/95 px-3 py-1.5 text-xs font-black text-[#2f2a24] shadow-md">
      {RESOURCE_ICONS[resource] ? (
        <img
          src={RESOURCE_ICONS[resource]}
          alt=""
          className="h-6 w-6 rounded-sm"
          draggable={false}
        />
      ) : null}
      <span className="text-[#7a5838]">{label}</span>
      {formatResource(resource)}
    </span>
  );
}

function SlotBadge({ slot }: { slot: IslandSlotSummary }) {
  if (slot.barbarianVillage) {
    return <Badge variant="danger">Barbarian Village</Badge>;
  }

  if (slot.city?.isOwnedByCurrentPlayer) {
    return <Badge variant="info">Your City</Badge>;
  }

  if (slot.city) {
    return <Badge variant="neutral">Occupied</Badge>;
  }

  return <Badge variant="success">Available</Badge>;
}

function SelectedCityPanel({
  slot,
  onEnterCity,
  onOpenOverview,
  onMessagePlayer,
  onScoutCity,
  onAttackCity,
  onNavalAttackCity,
  onFoundCity,
  onAttackVillage,
}: {
  slot: IslandSlotSummary;
  onEnterCity: () => void;
  onOpenOverview: () => void;
  onMessagePlayer: (playerId: string, playerName: string, cityName: string) => void;
  onScoutCity: (cityId: string) => void;
  onAttackCity: (cityId: string) => void;
  onNavalAttackCity: (cityId: string) => void;
  onFoundCity: () => void;
  onAttackVillage: (villageId: string) => void;
}) {
  const isOwnedCity = Boolean(slot.city?.isOwnedByCurrentPlayer);

  if (slot.barbarianVillage) {
    const village = slot.barbarianVillage;

    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-danger">
              Hostile Settlement
            </p>
            <h2 className="mt-1 text-2xl font-black text-[#2f2a24]">{village.name}</h2>
            <p className="text-sm font-bold text-[#6b5741]">
              {getSlotLabel(slot.slotIndex)} · Slot {slot.slotIndex}
            </p>
          </div>
          <Badge variant="danger">Level {village.level}</Badge>
        </div>
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-4 shadow-inner">
          <p className="text-sm font-bold leading-6 text-[#5e5145]">
            This Barbarian Village is unique to the island. Each victory raises its level for you,
            up to level 50, and increases the loot available from future attacks.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <InfoTile label="Level" value={village.level.toString()} />
          <InfoTile label="Strength" value={village.enemyStrength.toString()} />
          <InfoTile label="Loot" value={`${village.rewards.wood}W ${village.rewards.gold}G`} />
        </div>
        <Button onClick={() => onAttackVillage(village.id)} className="w-full">
          Attack Village
        </Button>
      </div>
    );
  }

  if (!slot.city) {
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#1f6f45]">
              Available Location
            </p>
            <h2 className="mt-1 text-2xl font-black text-[#2f2a24]">
              {getSlotLabel(slot.slotIndex)}
            </h2>
            <p className="text-sm font-bold text-[#6b5741]">Slot {slot.slotIndex}</p>
          </div>
          <Badge variant="success">Available</Badge>
        </div>
        <div className="rounded-lg border border-[#d6b982] bg-[#fff3d7] p-4">
          <p className="text-sm font-bold leading-6 text-[#5e5145]">
            This coastal plot is open for settlement. Founding a city creates a new level 1 colony
            with starter resources, workers, and core buildings.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <InfoTile label="Location" value={getSlotLabel(slot.slotIndex)} />
          <InfoTile label="Status" value="Available" />
          <InfoTile
            label="Requirement"
            value={slot.colonization?.canColonize ? 'Ready' : 'Locked'}
          />
        </div>
        {slot.colonization?.disabledReason ? (
          <Alert variant="info">{slot.colonization.disabledReason}</Alert>
        ) : null}
        <Button onClick={onFoundCity} className="w-full" disabled={!slot.colonization?.canColonize}>
          Found City Here
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-[#24585b]">City Garrison</p>
          <h2 className="mt-1 text-2xl font-black text-[#2f2a24]">{slot.city.name}</h2>
          <p className="text-sm font-bold text-[#6b5741]">
            {getSlotLabel(slot.slotIndex)} · Slot {slot.slotIndex}
          </p>
        </div>
        <SlotBadge slot={slot} />
      </div>
      <div className="rounded-lg border border-[#d6b982] bg-[#fff3d7] p-4 shadow-inner">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-14 w-14 items-center justify-center rounded-md border text-lg font-black shadow-inner ${
              isOwnedCity
                ? 'border-secondary bg-secondary/15 text-secondary'
                : 'border-[#d6b982] bg-[#ead8b8] text-[#6b5741]'
            }`}
          >
            {isOwnedCity ? 'Y' : 'C'}
          </span>
          <div>
            <p className="text-lg font-black text-[#2f2a24]">{slot.city.name}</p>
            <p className="text-sm font-bold text-[#6b5741]">Governor: {slot.city.playerName}</p>
          </div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <InfoTile label="Level" value={slot.city.level.toString()} />
        <InfoTile
          label="Owner"
          value={slot.city.isOwnedByCurrentPlayer ? 'You' : slot.city.playerName}
        />
        <InfoTile label="Status" value={isOwnedCity ? 'Controlled' : 'Foreign'} />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button onClick={onEnterCity} disabled={!isOwnedCity}>
          Enter City
        </Button>
        <Button variant="secondary" onClick={onOpenOverview} disabled={!isOwnedCity}>
          City Overview
        </Button>
        <Button
          variant={isOwnedCity ? 'ghost' : 'secondary'}
          disabled={isOwnedCity}
          onClick={() => {
            if (slot.city && !isOwnedCity) {
              onMessagePlayer(slot.city.playerId, slot.city.playerName, slot.city.name);
            }
          }}
        >
          Message Governor
        </Button>
        <Button
          variant={isOwnedCity ? 'ghost' : 'primary'}
          disabled={isOwnedCity}
          onClick={() => {
            if (slot.city && !isOwnedCity) {
              onScoutCity(slot.city.id);
            }
          }}
        >
          Scout City
        </Button>
        <Button
          variant={isOwnedCity ? 'ghost' : 'danger'}
          disabled={isOwnedCity}
          onClick={() => {
            if (slot.city && !isOwnedCity) {
              onAttackCity(slot.city.id);
            }
          }}
        >
          Attack City
        </Button>
        <Button
          variant={isOwnedCity ? 'ghost' : 'secondary'}
          disabled={isOwnedCity}
          onClick={() => {
            if (slot.city && !isOwnedCity) {
              onNavalAttackCity(slot.city.id);
            }
          }}
        >
          Naval Attack
        </Button>
      </div>
      {!isOwnedCity ? (
        <Alert variant="info">
          You can contact this governor now. Trade and diplomacy actions unlock in later systems.
        </Alert>
      ) : null}
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#d6b982] bg-[#fff3d7] px-3 py-3 shadow-inner">
      <p className="text-[11px] font-black uppercase tracking-wide text-[#7a5838]">{label}</p>
      <p className="mt-1 text-base font-black text-[#2f2a24]">{value}</p>
    </div>
  );
}

function formatCost(cost: Record<string, number>): string {
  return Object.entries(cost)
    .filter(([, amount]) => amount > 0)
    .map(([resource, amount]) => `${amount} ${formatResource(resource)}`)
    .join(', ');
}

function IslandSlotMarker({
  slot,
  isSelected,
  onSelect,
  onOpenActions,
}: {
  slot: IslandSlotSummary;
  isSelected: boolean;
  onSelect: (slotIndex: number) => void;
  onOpenActions: (slot: IslandSlotSummary) => void;
}) {
  const position = SLOT_POSITIONS[slot.slotIndex % SLOT_POSITIONS.length];
  const isOwnedCity = Boolean(slot.city?.isOwnedByCurrentPlayer);
  const isOccupied = Boolean(slot.city);
  const isVillage = slot.status === 'barbarian_village';
  const art = isVillage ? barbarianVillageArt : isOccupied ? cityArt : emptyCitySpotArt;

  return (
    <button
      type="button"
      onClick={() => {
        onSelect(slot.slotIndex);
        onOpenActions(slot);
      }}
      className={`group absolute z-20 flex w-[9%] min-w-[58px] max-w-[112px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 transition-all duration-150 hover:scale-110 ${
        isSelected ? 'scale-110' : ''
      }`}
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
      aria-label={`${getSlotLabel(slot.slotIndex)} ${
        slot.barbarianVillage
          ? slot.barbarianVillage.name
          : slot.city
            ? slot.city.name
            : 'available plot'
      }`}
    >
      <span
        className={`relative block aspect-[10/9] w-full rounded-lg ${
          isOwnedCity
            ? 'ring-4 ring-secondary/45'
            : isVillage
              ? 'ring-4 ring-danger/35'
              : isOccupied
                ? 'ring-4 ring-white/25'
                : 'soft-pulse ring-4 ring-success/35'
        } ${isSelected ? 'ring-white/70' : ''}`}
      >
        <img
          src={art}
          alt=""
          className="h-full w-full object-contain drop-shadow-xl"
          draggable={false}
        />
        <span className="sr-only">
          {isVillage
            ? 'Barbarian Village'
            : isOccupied
              ? isOwnedCity
                ? 'Your city'
                : 'Occupied city'
              : 'Available city slot'}
        </span>
      </span>
      <span
        className={`pointer-events-none rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide shadow-md ${
          isSelected
            ? 'border-secondary bg-secondary text-white opacity-100'
            : 'border-border bg-surface/95 text-text opacity-0 group-hover:opacity-100'
        }`}
      >
        {slot.barbarianVillage
          ? `Lv ${slot.barbarianVillage.level} Village`
          : slot.city
            ? slot.city.name
            : getSlotLabel(slot.slotIndex)}
      </span>
    </button>
  );
}

function ResourceSiteMarker({
  resource,
  position,
  onOpenActions,
}: {
  resource: ResourceSiteKind;
  position: { x: number; y: number };
  onOpenActions: (resource: ResourceSiteKind) => void;
}) {
  const buildingName = RESOURCE_SITE_BUILDINGS[resource];

  return (
    <button
      type="button"
      onClick={() => onOpenActions(resource)}
      className="group absolute z-10 flex w-[10%] min-w-[68px] max-w-[124px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 transition-all duration-150 hover:scale-110"
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
      aria-label={`${buildingName} resource site`}
    >
      <img
        src={RESOURCE_SITE_ART[resource]}
        alt=""
        className="aspect-[10/9] w-full object-contain drop-shadow-xl"
        draggable={false}
      />
      <span className="pointer-events-none rounded-full border border-[#d6b982] bg-[#fff8e9]/95 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-[#2f2a24] opacity-0 shadow-md group-hover:opacity-100">
        {buildingName}
      </span>
    </button>
  );
}

function IslandScene({
  island,
  slots,
  selectedSlot,
  selectedSlotIndex,
  availableSlots,
  occupiedSlots,
  travelTimeSeconds,
  hasBarbarianVillage = false,
  onBack,
  onSelectSlot,
  onOpenSlotActions,
  onOpenResourceSite,
}: {
  island: {
    id: string;
    name: string;
    x: number;
    y: number;
    mainResource: string;
    luxuryResource: string;
    maxSlots: number;
  };
  slots: IslandSlotSummary[];
  selectedSlot: IslandSlotSummary | null;
  selectedSlotIndex: number | null;
  availableSlots: number;
  occupiedSlots: number;
  travelTimeSeconds: number;
  hasBarbarianVillage?: boolean;
  onBack: () => void;
  onSelectSlot: (slotIndex: number) => void;
  onOpenSlotActions: (slot: IslandSlotSummary) => void;
  onOpenResourceSite: (resource: ResourceSiteKind) => void;
}) {
  const luxuryResource = isResourceSiteKind(island.luxuryResource) ? island.luxuryResource : null;
  const hasOwnedCity = getOwnedIslandCities(slots).length > 0;

  return (
    <section className="game-frame relative min-h-[760px] overflow-hidden rounded-lg bg-[#137f9c]">
      <div className="absolute inset-0">
        <div className="h-full w-full bg-[radial-gradient(circle_at_50%_22%,#47d1df_0%,#168fbb_46%,#0d5f8f_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-transparent to-black/20" />
      </div>

      <div className="absolute left-5 top-5 z-30 flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={onBack}>
          Back to World
        </Button>
        <span className="rounded-full border border-white/20 bg-text/40 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-white shadow-md backdrop-blur">
          Island {island.x}:{island.y}
        </span>
        <span className="rounded-full border border-white/20 bg-success/90 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-white shadow-md">
          {availableSlots} Open Slots
        </span>
        {hasBarbarianVillage ? (
          <span className="rounded-full border border-white/20 bg-danger/90 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-white shadow-md">
            Barbarian Village
          </span>
        ) : null}
      </div>

      <div className="absolute right-5 top-5 z-30 flex flex-wrap justify-end gap-2">
        <ResourceChip resource={island.luxuryResource} label="Luxury" />
      </div>

      <div className="relative z-10 min-h-[860px] p-5 pt-20">
        <div className="relative min-h-[760px]">
          <div className="absolute inset-x-0 top-0">
            <div className="relative mx-auto aspect-[1672/941] w-full overflow-hidden rounded-lg border border-white/15 shadow-2xl">
              <img
                src={islandViewBackground}
                alt=""
                className="absolute inset-0 h-full w-full object-contain"
                draggable={false}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/15" />
              <div className="absolute inset-0">
                {hasOwnedCity ? (
                  <>
                    <ResourceSiteMarker
                      resource="wood"
                      position={RESOURCE_SITE_POSITIONS.wood}
                      onOpenActions={onOpenResourceSite}
                    />
                    {luxuryResource ? (
                      <ResourceSiteMarker
                        resource={luxuryResource}
                        position={RESOURCE_SITE_POSITIONS.luxury}
                        onOpenActions={onOpenResourceSite}
                      />
                    ) : null}
                  </>
                ) : null}
                {slots.map((slot) => (
                  <IslandSlotMarker
                    key={slot.slotIndex}
                    slot={slot}
                    isSelected={
                      selectedSlot?.slotIndex === slot.slotIndex ||
                      selectedSlotIndex === slot.slotIndex
                    }
                    onSelect={onSelectSlot}
                    onOpenActions={onOpenSlotActions}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="absolute bottom-5 left-5 z-20 rounded-lg border border-white/15 bg-text/45 p-4 text-white shadow-lg backdrop-blur">
            <p className="text-xs font-black uppercase tracking-wide text-white/65">Island Bonus</p>
            <p className="mt-1 text-lg font-black">{getIslandBonus(island.mainResource)}</p>
            <p className="mt-1 text-xs font-bold text-white/70">
              Travel {formatTravelTime(travelTimeSeconds)} · {occupiedSlots} occupied
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ResourceWorkerDialog({
  resource,
  ownedCities,
  islandId,
  onClose,
}: {
  resource: ResourceSiteKind;
  ownedCities: OwnedIslandCity[];
  islandId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const buildingName = RESOURCE_SITE_BUILDINGS[resource];
  const producedResource = formatResource(resource);
  const workerField = resource === 'wood' ? 'woodWorkers' : 'luxuryWorkers';
  const [selectedCityId, setSelectedCityId] = useState(ownedCities[0]?.id ?? '');
  const selectedCity =
    ownedCities.find((city) => city.id === selectedCityId) ?? ownedCities[0] ?? null;
  const [workerCount, setWorkerCount] = useState(selectedCity?.workers[workerField] ?? 0);

  function chooseCity(cityId: string) {
    const nextCity = ownedCities.find((city) => city.id === cityId);
    setSelectedCityId(cityId);
    setWorkerCount(nextCity?.workers[workerField] ?? 0);
  }

  const mutation = useMutation({
    mutationFn: () => {
      if (!selectedCity) {
        throw new Error('Choose a city first.');
      }

      return assignWorkers(selectedCity.id, {
        woodWorkers: workerField === 'woodWorkers' ? workerCount : selectedCity.workers.woodWorkers,
        goldWorkers: selectedCity.workers.goldWorkers,
        luxuryWorkers:
          workerField === 'luxuryWorkers' ? workerCount : selectedCity.workers.luxuryWorkers,
        scientists: selectedCity.workers.scientists,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['island-detail', islandId] });
      if (selectedCity) {
        void queryClient.invalidateQueries({ queryKey: ['city-overview', selectedCity.id] });
      }
      void queryClient.invalidateQueries({ queryKey: ['research-overview'] });
      void queryClient.invalidateQueries({ queryKey: ['quest-overview'] });
      void queryClient.invalidateQueries({ queryKey: ['next-action'] });
      onClose();
    },
  });

  const otherAssigned = selectedCity
    ? selectedCity.workers.woodWorkers +
      selectedCity.workers.goldWorkers +
      selectedCity.workers.luxuryWorkers +
      selectedCity.workers.scientists -
      selectedCity.workers[workerField]
    : 0;
  const idleCitizens = selectedCity
    ? selectedCity.population.current - otherAssigned - workerCount
    : 0;
  const isOverPopulation = idleCitizens < 0;
  const hasChanges = selectedCity ? workerCount !== selectedCity.workers[workerField] : false;

  return (
    <Modal isOpen onClose={onClose} title={buildingName}>
      <div className="space-y-4">
        <div className="rounded-lg border border-[#d6b982] bg-[#fff3d7] p-4">
          <div className="flex items-center gap-4">
            <img
              src={RESOURCE_SITE_ART[resource]}
              alt=""
              className="h-24 w-28 object-contain"
              draggable={false}
            />
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[#24585b]">
                Resource Site
              </p>
              <h2 className="text-xl font-black text-[#2f2a24]">{buildingName}</h2>
              <p className="mt-1 text-sm font-bold text-[#6b5741]">Produces {producedResource}</p>
            </div>
          </div>
        </div>

        {ownedCities.length === 0 ? (
          <Alert variant="info">
            You need a city on this island before assigning workers here.
          </Alert>
        ) : (
          <>
            <label className="block">
              <span className="text-xs font-black uppercase tracking-wide text-[#7a5838]">
                City
              </span>
              <select
                value={selectedCity?.id ?? ''}
                onChange={(event) => chooseCity(event.target.value)}
                className="mt-1 w-full rounded-md border border-[#d6b982] bg-[#fff8e9] px-3 py-2 text-sm font-bold text-[#2f2a24] shadow-inner"
              >
                {ownedCities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-3 sm:grid-cols-3">
              <InfoTile
                label="Population"
                value={selectedCity ? selectedCity.population.current.toString() : '0'}
              />
              <InfoTile label="Idle After Save" value={idleCitizens.toString()} />
              <InfoTile
                label="Current Workers"
                value={selectedCity ? selectedCity.workers[workerField].toString() : '0'}
              />
            </div>

            <div className="rounded-md border border-[#d6b982] bg-[#fff8e9] px-4 py-3 shadow-inner">
              <p className="text-[11px] font-black uppercase tracking-wide text-[#7a5838]">
                {resource === 'wood' ? 'Wood Workers' : 'Luxury Workers'}
              </p>
              <div className="mt-2 flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => setWorkerCount((current) => Math.max(0, current - 1))}
                  className="h-9 w-9 rounded border border-[#d6b982] bg-[#fff3d7] text-lg font-black text-[#24585b] transition-colors hover:bg-[#ead8b8]"
                  aria-label="Decrease workers"
                >
                  -
                </button>
                <span className="w-12 text-center text-2xl font-black text-[#2f2a24]">
                  {workerCount}
                </span>
                <button
                  type="button"
                  onClick={() => setWorkerCount((current) => current + 1)}
                  className="h-9 w-9 rounded border border-[#d6b982] bg-[#fff3d7] text-lg font-black text-[#24585b] transition-colors hover:bg-[#ead8b8]"
                  aria-label="Increase workers"
                >
                  +
                </button>
              </div>
            </div>

            {resource !== 'wood' ? (
              <Alert variant="info">
                Luxury workers require the Luxury Extractor in the selected city.
              </Alert>
            ) : null}
            {isOverPopulation ? (
              <Alert variant="danger">
                Assigned citizens cannot exceed this city&apos;s population.
              </Alert>
            ) : null}
            {mutation.isError ? <Alert variant="danger">{mutation.error.message}</Alert> : null}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
                Cancel
              </Button>
              <Button
                onClick={() => mutation.mutate()}
                disabled={!selectedCity || isOverPopulation || !hasChanges || mutation.isPending}
              >
                {mutation.isPending ? 'Saving...' : 'Save Workers'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function IslandActionModal({
  action,
  island,
  ownedCities,
  islandId,
  onClose,
  onFoundCity,
  onAttackVillage,
  onEnterCity,
  onOpenOverview,
  onMessagePlayer,
  onScoutCity,
  onAttackCity,
  onNavalAttackCity,
}: {
  action: IslandActionDialog | null;
  island: {
    name: string;
  };
  ownedCities: OwnedIslandCity[];
  islandId: string;
  onClose: () => void;
  onFoundCity: (slotIndex: number) => void;
  onAttackVillage: (villageId: string) => void;
  onEnterCity: (cityId: string) => void;
  onOpenOverview: (cityId: string) => void;
  onMessagePlayer: (playerId: string, playerName: string, cityName: string) => void;
  onScoutCity: (cityId: string) => void;
  onAttackCity: (cityId: string) => void;
  onNavalAttackCity: (cityId: string) => void;
}) {
  if (!action) {
    return null;
  }

  if (action.type === 'resource') {
    return (
      <ResourceWorkerDialog
        resource={action.resource}
        ownedCities={ownedCities}
        islandId={islandId}
        onClose={onClose}
      />
    );
  }

  const slot = action.slot;

  if (slot.city) {
    return (
      <Modal isOpen onClose={onClose} title={slot.city.name}>
        <div className="space-y-5">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#24585b]">
              Island Command
            </p>
            <h1 className="mt-1 text-3xl font-black text-[#2f2a24]">{island.name}</h1>
            <p className="mt-2 text-base font-bold leading-7 text-[#5e5145]">
              Select a city marker, open plot, or Barbarian Village slot on the island.
            </p>
          </div>
          <SelectedCityPanel
            slot={slot}
            onEnterCity={() => {
              if (slot.city?.isOwnedByCurrentPlayer) {
                onClose();
                onEnterCity(slot.city.id);
              }
            }}
            onOpenOverview={() => {
              if (slot.city?.isOwnedByCurrentPlayer) {
                onClose();
                onOpenOverview(slot.city.id);
              }
            }}
            onMessagePlayer={(playerId, playerName, cityName) => {
              onClose();
              onMessagePlayer(playerId, playerName, cityName);
            }}
            onScoutCity={(cityId) => {
              onClose();
              onScoutCity(cityId);
            }}
            onAttackCity={(cityId) => {
              onClose();
              onAttackCity(cityId);
            }}
            onNavalAttackCity={(cityId) => {
              onClose();
              onNavalAttackCity(cityId);
            }}
            onFoundCity={() => undefined}
            onAttackVillage={() => undefined}
          />
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={slot.barbarianVillage ? slot.barbarianVillage.name : getSlotLabel(slot.slotIndex)}
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-[#d6b982] bg-[#fff3d7] p-4">
          <div className="flex items-center gap-4">
            <img
              src={slot.barbarianVillage ? barbarianVillageArt : emptyCitySpotArt}
              alt=""
              className="h-24 w-28 object-contain"
              draggable={false}
            />
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[#24585b]">
                Island Slot
              </p>
              <h2 className="text-xl font-black text-[#2f2a24]">
                {slot.barbarianVillage ? 'Barbarian Village' : 'Empty City Spot'}
              </h2>
              <p className="mt-1 text-sm font-bold text-[#6b5741]">Slot {slot.slotIndex}</p>
            </div>
          </div>
        </div>

        {slot.barbarianVillage ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <InfoTile label="Level" value={slot.barbarianVillage.level.toString()} />
              <InfoTile label="Strength" value={slot.barbarianVillage.enemyStrength.toString()} />
              <InfoTile label="Loot" value={`${slot.barbarianVillage.rewards.wood} Wood`} />
            </div>
            <Button
              className="w-full"
              onClick={() => {
                onClose();
                onAttackVillage(slot.barbarianVillage?.id ?? '');
              }}
            >
              Attack Village
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm font-bold leading-6 text-[#5e5145]">
              This empty city spot can become a new colony when colonization requirements are ready.
            </p>
            {slot.colonization?.disabledReason ? (
              <Alert variant="info">{slot.colonization.disabledReason}</Alert>
            ) : null}
            <Button
              className="w-full"
              onClick={() => {
                onClose();
                onFoundCity(slot.slotIndex);
              }}
              disabled={!slot.colonization?.canColonize}
            >
              Found City Here
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}

export function IslandPage() {
  const { islandId } = useParams();
  const navigate = useNavigate();
  const selectedCityId = useAppStore((state) => state.selectedCityId);
  const setSelectedCityId = useAppStore((state) => state.setSelectedCityId);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [pendingSettleSlotIndex, setPendingSettleSlotIndex] = useState<number | null>(null);
  const [attackVillageId, setAttackVillageId] = useState<string | null>(null);
  const [attackCityId, setAttackCityId] = useState<string | null>(null);
  const [navalAttackCityId, setNavalAttackCityId] = useState<string | null>(null);
  const [scoutTargetCityId, setScoutTargetCityId] = useState<string | null>(null);
  const [actionDialog, setActionDialog] = useState<IslandActionDialog | null>(null);

  const islandQuery = useQuery({
    queryKey: ['island-detail', islandId],
    queryFn: () => getIslandDetail(islandId ?? ''),
    enabled: Boolean(islandId),
    retry: 1,
  });

  const selectedSlot = useMemo(() => {
    if (!islandQuery.data) {
      return null;
    }

    if (selectedSlotIndex !== null) {
      return islandQuery.data.slots.find((slot) => slot.slotIndex === selectedSlotIndex) ?? null;
    }

    return (
      islandQuery.data.slots.find((slot) => slot.city?.isOwnedByCurrentPlayer) ??
      islandQuery.data.slots.find((slot) => slot.city) ??
      islandQuery.data.slots[0] ??
      null
    );
  }, [islandQuery.data, selectedSlotIndex]);

  const settleMutation = useMutation({
    mutationFn: ({ targetIslandId, slotIndex }: { targetIslandId: string; slotIndex: number }) =>
      settleCity(targetIslandId, slotIndex),
    onSuccess: (response) => {
      setSelectedCityId(response.city.id);
      navigate('/');
    },
  });

  if (islandQuery.isLoading) {
    return <LoadingState message="Opening island..." />;
  }

  if (islandQuery.isError || !islandQuery.data || !islandId) {
    return <ErrorState title="Unable to load island." onRetry={() => void islandQuery.refetch()} />;
  }

  const { island, slots } = islandQuery.data;
  const ownedCities = getOwnedIslandCities(slots);
  const availableSlots = slots.filter((slot) => slot.status === 'empty').length;
  const occupiedSlots = slots.length - availableSlots;
  const islandVillage = islandQuery.data.barbarianVillage;
  const pendingSlot =
    pendingSettleSlotIndex !== null
      ? (slots.find((slot) => slot.slotIndex === pendingSettleSlotIndex) ?? null)
      : null;

  function openSettlement(slotIndex: number) {
    setPendingSettleSlotIndex(slotIndex);
  }

  function confirmSettlement() {
    if (!islandId || pendingSettleSlotIndex === null) {
      return;
    }

    settleMutation.mutate({ targetIslandId: islandId, slotIndex: pendingSettleSlotIndex });
  }

  return (
    <div className="space-y-6">
      <IslandScene
        island={island}
        slots={slots}
        selectedSlot={selectedSlot}
        selectedSlotIndex={selectedSlotIndex}
        availableSlots={availableSlots}
        occupiedSlots={occupiedSlots}
        travelTimeSeconds={islandQuery.data.travelTimeSeconds}
        hasBarbarianVillage={Boolean(islandVillage)}
        onBack={() => navigate('/map')}
        onSelectSlot={setSelectedSlotIndex}
        onOpenSlotActions={(slot) => setActionDialog({ type: 'slot', slot })}
        onOpenResourceSite={(resource) => setActionDialog({ type: 'resource', resource })}
      />

      <IslandActionModal
        action={actionDialog}
        island={island}
        ownedCities={ownedCities}
        islandId={islandId}
        onClose={() => setActionDialog(null)}
        onFoundCity={openSettlement}
        onAttackVillage={setAttackVillageId}
        onEnterCity={(cityId) => {
          setSelectedCityId(cityId);
          navigate('/');
        }}
        onOpenOverview={(cityId) => {
          setSelectedCityId(cityId);
          navigate('/overview');
        }}
        onMessagePlayer={(playerId, playerName, cityName) => {
          const params = new URLSearchParams({
            recipientPlayerId: playerId,
            recipientName: playerName,
            subject: `Regarding ${cityName}`,
          });
          navigate(`/messages?${params.toString()}`);
        }}
        onScoutCity={setScoutTargetCityId}
        onAttackCity={setAttackCityId}
        onNavalAttackCity={setNavalAttackCityId}
      />

      <SpyMissionModal
        isOpen={Boolean(scoutTargetCityId)}
        originCityId={selectedCityId}
        targetCityId={scoutTargetCityId}
        onClose={() => setScoutTargetCityId(null)}
      />

      <PvpAttackModal
        targetCityId={attackCityId}
        originCityId={selectedCityId}
        onClose={() => setAttackCityId(null)}
      />

      <NavalAttackModal
        targetCityId={navalAttackCityId}
        originCityId={selectedCityId}
        onClose={() => setNavalAttackCityId(null)}
      />

      <Modal
        isOpen={Boolean(pendingSlot)}
        onClose={() => setPendingSettleSlotIndex(null)}
        title="Found New City"
      >
        {pendingSlot ? (
          <div className="space-y-4">
            <div className="rounded-md border border-border bg-surface/70 p-3">
              <dl className="grid gap-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="font-bold text-muted">Island</dt>
                  <dd className="font-black text-text">{island.name}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="font-bold text-muted">Location</dt>
                  <dd className="font-black text-text">{getSlotLabel(pendingSlot.slotIndex)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="font-bold text-muted">Main Resource</dt>
                  <dd className="font-black text-text">{formatResource(island.mainResource)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="font-bold text-muted">Starting Bonus</dt>
                  <dd className="font-black text-primary">{getIslandBonus(island.mainResource)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="font-bold text-muted">Cost</dt>
                  <dd className="font-black text-text">
                    {pendingSlot.colonization
                      ? formatCost(pendingSlot.colonization.cost)
                      : 'Unknown'}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="font-bold text-muted">Travel Time</dt>
                  <dd className="font-black text-text">
                    {pendingSlot.colonization
                      ? formatTravelTime(pendingSlot.colonization.travelTimeSeconds)
                      : formatTravelTime(islandQuery.data.travelTimeSeconds)}
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
                onClick={() => setPendingSettleSlotIndex(null)}
                disabled={settleMutation.isPending}
              >
                Cancel
              </Button>
              <Button onClick={confirmSettlement} disabled={settleMutation.isPending}>
                {settleMutation.isPending ? 'Founding...' : 'Confirm City'}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={Boolean(attackVillageId)}
        onClose={() => setAttackVillageId(null)}
        title="Attack Barbarian Village"
      >
        {attackVillageId ? <PveCampDetailPanel campId={attackVillageId} /> : null}
      </Modal>
    </div>
  );
}
