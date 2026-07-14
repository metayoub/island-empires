import type { EmptySlotConfig } from '../city-view.types';
import emptyPlotArt from '../../../assets/img/city/generated/empty-spot.png';
import governorResidencyArt from '../../../assets/img/city/generated/governor_residency.png';
import wallArt from '../../../assets/img/city/generated/wall.png';

type EmptySlotProps = {
  slot: EmptySlotConfig;
};

export function EmptySlot({ slot }: EmptySlotProps) {
  const sprite =
    slot.image === 'governor_residency'
      ? governorResidencyArt
      : slot.image === 'wall'
        ? wallArt
        : emptyPlotArt;

  return (
    <div
      aria-hidden="true"
      className="absolute flex flex-col items-center justify-center"
      style={{
        left: `${slot.x}%`,
        top: `${slot.y}%`,
        width: `${slot.width}%`,
        height: `${slot.height}%`,
        zIndex: slot.zIndex,
      }}
    >
      <img
        src={sprite}
        alt=""
        className="h-full w-full object-contain drop-shadow-md"
        draggable={false}
      />
    </div>
  );
}
