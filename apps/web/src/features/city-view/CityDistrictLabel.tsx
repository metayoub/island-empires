type CityDistrictLabelProps = {
  label: string;
  x: number;
  y: number;
};

export function CityDistrictLabel({ label, x, y }: CityDistrictLabelProps) {
  return (
    <span
      className="pointer-events-none absolute z-20 rounded-full border border-[#d9bf87] bg-[#fff6df]/90 px-3 py-1 text-[11px] font-black uppercase text-[#6b5434] shadow"
      style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
    >
      {label}
    </span>
  );
}
