import constructionArt from '../../../assets/img/city/construct.png';
import buildSiteArt from '../../../assets/img/city/generated/build-site.png';
import academyArt from '../../../assets/img/city/generated/academy.png';
import barracksArt from '../../../assets/img/city/generated/barracks.png';
import buildersGuildArt from '../../../assets/img/city/generated/builders_guild.png';
import cityHallArt from '../../../assets/img/city/generated/city_hall.png';
import crystalLensworksArt from '../../../assets/img/city/generated/crystal_lensworks.png';
import forestersHouseArt from '../../../assets/img/city/generated/foresters_house.png';
import governorResidencyArt from '../../../assets/img/city/generated/governor_residency.png';
import hospitalArt from '../../../assets/img/city/generated/hospital.png';
import luxuryExtractorArt from '../../../assets/img/city/generated/luxury_extractor.png';
import marbleMasonArt from '../../../assets/img/city/generated/marble_mason.png';
import palaceArt from '../../../assets/img/city/generated/palace.png';
import portArt from '../../../assets/img/city/generated/port.png';
import shipyardArt from '../../../assets/img/city/generated/shipyard.png';
import spyAgencyArt from '../../../assets/img/city/generated/spy_agency.png';
import sulfurRefineryArt from '../../../assets/img/city/generated/sulfur_refinery.png';
import tavernArt from '../../../assets/img/city/generated/tavern.png';
import tradingPostArt from '../../../assets/img/city/generated/trading_post.png';
import vineyardEstateArt from '../../../assets/img/city/generated/vineyard_estate.png';
import wallArt from '../../../assets/img/city/generated/wall.png';
import warehouseArt from '../../../assets/img/city/generated/warehouse.png';
import workshopArt from '../../../assets/img/city/generated/workshop.png';
import groundArt from '../../../assets/img/city/ground.png';

const ART_BY_TYPE: Record<string, string> = {
  city_hall: cityHallArt,
  academy: academyArt,
  warehouse: warehouseArt,
  barracks: barracksArt,
  builders_guild: buildersGuildArt,
  crystal_lensworks: crystalLensworksArt,
  foresters_house: forestersHouseArt,
  luxury_extractor: luxuryExtractorArt,
  marble_mason: marbleMasonArt,
  marketplace: tradingPostArt,
  trading_post: tradingPostArt,
  hospital: hospitalArt,
  shipyard: shipyardArt,
  sulfur_refinery: sulfurRefineryArt,
  tavern: tavernArt,
  port: portArt,
  vineyard_estate: vineyardEstateArt,
  governor_residency: governorResidencyArt,
  palace: palaceArt,
  wall: wallArt,
  workshop: workshopArt,
  spy_agency: spyAgencyArt,
};

type BuildingArtProps = {
  buildingType: string;
  variant?: 'built' | 'site' | 'ghost' | 'construction';
};

export function BuildingArt({ buildingType, variant = 'built' }: BuildingArtProps) {
  const sprite =
    variant === 'site'
      ? buildSiteArt
      : variant === 'construction'
        ? constructionArt
        : (ART_BY_TYPE[buildingType] ?? groundArt);

  return (
    <img
      src={sprite}
      alt=""
      className={`h-full w-full object-contain ${variant === 'ghost' ? 'opacity-55 saturate-50' : ''}`}
      draggable={false}
      aria-hidden="true"
    />
  );
}
