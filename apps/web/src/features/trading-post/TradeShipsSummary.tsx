import { CityActionShortcut } from '../city-view/CityActionShortcut';

export function TradeShipsSummary() {
  return (
    <CityActionShortcut
      to="/transport"
      label="Trade Ships"
      description="Check available ships, capacity, and travel times."
    />
  );
}
