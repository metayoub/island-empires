import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import type { IslandSummary } from '@island-empires/shared-types';
import oceanTexture from '../../../assets/img/world/ocean.png';
import island0 from '../../../assets/img/world/island_0.png';
import island0Active from '../../../assets/img/world/island_0_active.png';
import island1 from '../../../assets/img/world/island_1.png';
import island1Active from '../../../assets/img/world/island_1_active.png';
import island2 from '../../../assets/img/world/island_2.png';
import island2Active from '../../../assets/img/world/island_2_active.png';
import island3 from '../../../assets/img/world/island_3.png';
import island3Active from '../../../assets/img/world/island_3_active.png';
import island4 from '../../../assets/img/world/island_4.png';
import island4Active from '../../../assets/img/world/island_4_active.png';
import island5 from '../../../assets/img/world/island_5.png';
import island5Active from '../../../assets/img/world/island_5_active.png';
import marbleIcon from '../../../assets/img/island/img_marble.jpg';
import wineIcon from '../../../assets/img/island/img_wine.jpg';
import crystalIcon from '../../../assets/img/island/img_glass.jpg';
import sulfurIcon from '../../../assets/img/island/img_sulfur.jpg';

type WorldMapSceneProps = {
  islands: IslandSummary[];
  width: number;
  height: number;
  selectedIslandId: string | null;
  centerRequestKey?: number;
  onSelectIsland: (islandId: string) => void;
};

const RESOURCE_LABELS: Record<string, string> = {
  wood: 'Wood',
  marble: 'Marble',
  wine: 'Wine',
  crystal: 'Crystal',
  sulfur: 'Sulfur',
  gold: 'Gold',
};

const PAN_STEP = 10;
const WORLD_SCALE = 1600;
const MAX_PAN = WORLD_SCALE - 100;
const INITIAL_PAN = { x: MAX_PAN / 2, y: MAX_PAN / 2 };
const ISLAND_WIDTH_PERCENT = 1.15;
const PLAYER_ISLAND_WIDTH_PERCENT = 1.28;
const DRAG_THRESHOLD_PX = 5;
const ISLAND_VARIANTS = [island0, island1, island2, island3, island4, island5];
const ACTIVE_ISLAND_VARIANTS = [
  island0Active,
  island1Active,
  island2Active,
  island3Active,
  island4Active,
  island5Active,
];
const LUXURY_ICONS: Record<string, string> = {
  marble: marbleIcon,
  wine: wineIcon,
  crystal: crystalIcon,
  sulfur: sulfurIcon,
};

function formatResource(resource: string): string {
  return RESOURCE_LABELS[resource] ?? resource;
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

function clampPan(value: number): number {
  return Math.max(0, Math.min(MAX_PAN, value));
}

function getStableHash(input: string): number {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function getIslandVariantIndex(island: IslandSummary): number {
  const variantSeed = [
    island.id,
    island.name,
    island.mainResource,
    island.luxuryResource,
    island.x,
    island.y,
  ].join(':');

  return getStableHash(variantSeed) % ISLAND_VARIANTS.length;
}

function getIslandZIndex({
  isSelected,
  isHovered,
  hasPlayerCity,
}: {
  isSelected: boolean;
  isHovered: boolean;
  hasPlayerCity: boolean;
}): number {
  if (isSelected) {
    return 90;
  }

  if (isHovered) {
    return 80;
  }

  return hasPlayerCity ? 70 : 20;
}

function CompassButton({
  label,
  text,
  className,
  onClick,
}: {
  label: string;
  text: string;
  className: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      onPointerDown={(event) => event.stopPropagation()}
      className={`absolute flex h-8 w-8 items-center justify-center rounded-full border border-[#d6b982] bg-[#fff8e9]/95 text-xs font-black text-[#24585b] shadow-md transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${className}`}
    >
      {text}
    </button>
  );
}

export function WorldMapScene({
  islands,
  width,
  height,
  selectedIslandId,
  centerRequestKey = 0,
  onSelectIsland,
}: WorldMapSceneProps) {
  const [hoveredIslandId, setHoveredIslandId] = useState<string | null>(null);
  const [pan, setPan] = useState(INITIAL_PAN);
  const [isDragging, setIsDragging] = useState(false);
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    lastX: number;
    lastY: number;
    totalX: number;
    totalY: number;
  } | null>(null);
  const suppressNextClickRef = useRef(false);
  const hasCenteredInitialSelection = useRef(false);

  function getIslandMapPosition(island: IslandSummary) {
    const normalizedX = (island.x / width) * 100;
    const normalizedY = (island.y / height) * 100;

    return { x: normalizedX, y: normalizedY };
  }

  function movePan(deltaX: number, deltaY: number) {
    setPan((current) => ({
      x: clampPan(current.x + deltaX),
      y: clampPan(current.y + deltaY),
    }));
  }

  function movePanByPixels(deltaX: number, deltaY: number) {
    const scene = sceneRef.current;

    if (!scene) {
      return;
    }

    const { width: sceneWidth, height: sceneHeight } = scene.getBoundingClientRect();

    if (sceneWidth === 0 || sceneHeight === 0) {
      return;
    }

    setPan((current) => ({
      x: clampPan(current.x - (deltaX / sceneWidth) * 100),
      y: clampPan(current.y - (deltaY / sceneHeight) * 100),
    }));
  }

  function centerOnIsland(island: IslandSummary | undefined) {
    if (!island) {
      return;
    }

    const islandPosition = getIslandMapPosition(island);
    const islandX = (islandPosition.x / 100) * WORLD_SCALE;
    const islandY = (islandPosition.y / 100) * WORLD_SCALE;
    setPan({
      x: clampPan(islandX - 50),
      y: clampPan(islandY - 50),
    });
  }

  const selectedIsland = islands.find((island) => island.id === selectedIslandId);
  const visibleIslands = useMemo(() => {
    const visibleLeft = (pan.x / WORLD_SCALE) * width;
    const visibleTop = (pan.y / WORLD_SCALE) * height;
    const visibleRight = ((pan.x + 100) / WORLD_SCALE) * width;
    const visibleBottom = ((pan.y + 100) / WORLD_SCALE) * height;
    const horizontalBuffer = width * 0.08;
    const verticalBuffer = height * 0.08;

    return islands.filter(
      (island) =>
        island.x >= visibleLeft - horizontalBuffer &&
        island.x <= visibleRight + horizontalBuffer &&
        island.y >= visibleTop - verticalBuffer &&
        island.y <= visibleBottom + verticalBuffer,
    );
  }, [height, islands, pan.x, pan.y, width]);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }

    dragStateRef.current = {
      pointerId: event.pointerId,
      lastX: event.clientX,
      lastY: event.clientY,
      totalX: 0,
      totalY: 0,
    };
    suppressNextClickRef.current = false;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - dragState.lastX;
    const deltaY = event.clientY - dragState.lastY;
    dragState.lastX = event.clientX;
    dragState.lastY = event.clientY;
    dragState.totalX += deltaX;
    dragState.totalY += deltaY;

    if (
      Math.hypot(dragState.totalX, dragState.totalY) >= DRAG_THRESHOLD_PX ||
      suppressNextClickRef.current
    ) {
      suppressNextClickRef.current = true;
      movePanByPixels(deltaX, deltaY);
    }
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    dragStateRef.current = null;
    setIsDragging(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    window.setTimeout(() => {
      suppressNextClickRef.current = false;
    }, 0);
  }

  useEffect(() => {
    if (!selectedIsland) {
      return;
    }

    if (!hasCenteredInitialSelection.current) {
      hasCenteredInitialSelection.current = true;
      centerOnIsland(selectedIsland);
    }
  }, [selectedIsland]);

  useEffect(() => {
    if (selectedIsland) {
      centerOnIsland(selectedIsland);
    }
  }, [centerRequestKey]);

  return (
    <div
      ref={sceneRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      className="game-frame relative w-full overflow-hidden rounded-lg bg-[#137f9c]"
      style={{ aspectRatio: '16 / 10', cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
    >
      <div
        className={`absolute left-0 top-0 ${isDragging ? '' : 'transition-[left,top] duration-300 ease-out'}`}
        style={{
          left: `-${pan.x}%`,
          top: `-${pan.y}%`,
          width: `${WORLD_SCALE}%`,
          height: `${WORLD_SCALE}%`,
          backgroundImage: `url(${oceanTexture})`,
          backgroundRepeat: 'repeat',
          backgroundSize: '238px 120px',
          cursor: isDragging ? 'grabbing' : 'grab',
          touchAction: 'none',
        }}
      >
        {visibleIslands.map((island) => {
          const isSelected = island.id === selectedIslandId;
          const isHovered = hoveredIslandId === island.id;
          const variantIndex = getIslandVariantIndex(island);
          const sprite =
            isSelected || isHovered || island.hasPlayerCity
              ? ACTIVE_ISLAND_VARIANTS[variantIndex]
              : ISLAND_VARIANTS[variantIndex];
          const { x: left, y: top } = getIslandMapPosition(island);
          const labelIsVisible = isSelected || isHovered || island.hasPlayerCity;

          return (
            <button
              key={island.id}
              type="button"
              aria-label={`Island ${island.name} at ${island.x}:${island.y}, ${island.occupiedSlots} of ${island.maxSlots} slots occupied. ${formatResource(island.mainResource)} and ${formatResource(island.luxuryResource)}.`}
              aria-pressed={isSelected}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                if (suppressNextClickRef.current) {
                  event.preventDefault();
                  suppressNextClickRef.current = false;
                  return;
                }

                onSelectIsland(island.id);
                centerOnIsland(island);
              }}
              onMouseEnter={() => setHoveredIslandId(island.id)}
              onMouseLeave={() =>
                setHoveredIslandId((current) => (current === island.id ? null : current))
              }
              onFocus={() => setHoveredIslandId(island.id)}
              onBlur={() =>
                setHoveredIslandId((current) => (current === island.id ? null : current))
              }
              className="group absolute cursor-pointer focus-visible:outline-none"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: `${island.hasPlayerCity ? PLAYER_ISLAND_WIDTH_PERCENT : ISLAND_WIDTH_PERCENT}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: getIslandZIndex({
                  isSelected,
                  isHovered,
                  hasPlayerCity: island.hasPlayerCity,
                }),
              }}
            >
              <span
                className={`relative block aspect-[238/120] w-full transition-all duration-200 group-hover:scale-105 group-focus-visible:ring-2 group-focus-visible:ring-primary ${
                  isSelected
                    ? 'scale-105 drop-shadow-[0_0_26px_rgba(242,236,224,0.65)]'
                    : 'drop-shadow-md'
                }`}
              >
                <img
                  src={sprite}
                  alt=""
                  className="absolute inset-0 h-full w-full object-contain"
                  draggable={false}
                />
              </span>
              <span
                className={`pointer-events-none absolute left-1/2 top-full mt-1 flex min-w-[118px] -translate-x-1/2 items-center justify-between gap-2 rounded-full border border-[#d6b982] bg-[#fff8e9]/95 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-[#2f2a24] shadow-lg transition-opacity ${
                  labelIsVisible ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
              >
                <span className="min-w-0 truncate">{island.name}</span>
                <span className="whitespace-nowrap rounded-full bg-[#2f6f73]/12 px-1.5 text-[#24585b]">
                  {island.occupiedSlots}/{island.maxSlots}
                </span>
              </span>
              {isSelected || isHovered ? (
                <span className="pointer-events-none absolute left-1/2 top-full mt-7 w-max -translate-x-1/2 rounded-full border border-white/45 bg-text/70 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-lg">
                  <img
                    src={LUXURY_ICONS[island.luxuryResource]}
                    alt=""
                    className="mr-1 inline h-4 w-4 rounded-sm align-[-3px]"
                    draggable={false}
                  />
                  {formatResource(island.luxuryResource)} ·{' '}
                  {formatTravelTime(island.travelTimeSeconds)}
                </span>
              ) : null}
              {island.hasPlayerCity ? (
                <span className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-secondary px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white shadow-lg ring-2 ring-[#fff8e9]/90">
                  Your City
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,transparent_62%,rgba(9,60,91,0.45)_100%)]" />

      <div className="absolute right-5 top-5 z-40 h-32 w-32 rounded-full border border-[#d6b982] bg-[#fff8e9]/90 shadow-lg backdrop-blur">
        <div className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#d6b982] bg-[#f2e8d2] text-center text-[10px] font-black uppercase leading-[3rem] text-[#7a5838]">
          Map
        </div>
        <CompassButton
          label="Move north"
          text="N"
          className="left-1/2 top-2 -translate-x-1/2"
          onClick={() => movePan(0, -PAN_STEP)}
        />
        <CompassButton
          label="Move south"
          text="S"
          className="bottom-2 left-1/2 -translate-x-1/2"
          onClick={() => movePan(0, PAN_STEP)}
        />
        <CompassButton
          label="Move west"
          text="W"
          className="left-2 top-1/2 -translate-y-1/2"
          onClick={() => movePan(-PAN_STEP, 0)}
        />
        <CompassButton
          label="Move east"
          text="E"
          className="right-2 top-1/2 -translate-y-1/2"
          onClick={() => movePan(PAN_STEP, 0)}
        />
      </div>

      <div className="absolute bottom-5 left-5 z-40 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => centerOnIsland(selectedIsland)}
          onPointerDown={(event) => event.stopPropagation()}
          className="rounded-full border border-white/20 bg-text/60 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-white shadow-md backdrop-blur transition-colors hover:bg-text/75"
        >
          Center selected
        </button>
        <button
          type="button"
          onClick={() => setPan(INITIAL_PAN)}
          onPointerDown={(event) => event.stopPropagation()}
          className="rounded-full border border-white/20 bg-text/60 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-white shadow-md backdrop-blur transition-colors hover:bg-text/75"
        >
          Reset compass
        </button>
      </div>
    </div>
  );
}
