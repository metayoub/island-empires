import { CityActionShortcut } from '../city-view/CityActionShortcut';

export function ActiveTradesPanel() {
  return (
    <CityActionShortcut
      to="/transport"
      label="Active Trades"
      description="Review outgoing trade movements and arrivals."
    />
  );
}
