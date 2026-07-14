import cityViewBackground from '../../../assets/img/city/city.png';

export function CityBackground() {
  return (
    <>
      <img
        src={cityViewBackground}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/20" />
    </>
  );
}
