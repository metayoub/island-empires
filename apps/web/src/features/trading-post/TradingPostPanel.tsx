import { CreateOfferModal } from './CreateOfferModal';
import { SendResourcesModal } from './SendResourcesModal';
import { ActiveTradesPanel } from './ActiveTradesPanel';
import { BrowseOffersPanel } from './BrowseOffersPanel';
import { TradeShipsSummary } from './TradeShipsSummary';

export function TradingPostPanel() {
  return (
    <div className="space-y-3 rounded-md border border-primary/20 bg-primary/5 p-3">
      <div>
        <p className="text-[11px] font-black uppercase tracking-wide text-muted">Trading Post Actions</p>
        <p className="mt-1 text-sm font-semibold text-muted">Manage commerce without returning to the city overview.</p>
      </div>
      <CreateOfferModal />
      <SendResourcesModal />
      <div className="grid gap-2">
        <BrowseOffersPanel />
        <ActiveTradesPanel />
        <TradeShipsSummary />
      </div>
    </div>
  );
}
