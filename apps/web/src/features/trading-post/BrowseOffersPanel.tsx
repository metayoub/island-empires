import { CityActionShortcut } from '../city-view/CityActionShortcut';

export function BrowseOffersPanel() {
  return (
    <CityActionShortcut
      to="/marketplace"
      label="Browse Offers"
      description="Filter active offers and accept from this city."
    />
  );
}
