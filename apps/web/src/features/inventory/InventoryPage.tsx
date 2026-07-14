import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Alert, Button, Card, EmptyState, ErrorState, LoadingState, Modal } from '../../components/ui';
import { getCities } from '../city/city.api';
import {
  equipInventoryItem,
  getInventory,
  type InventoryItem,
  unequipCosmetic,
  useInventoryItem,
} from './inventory.api';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'consumable', label: 'Consumables' },
  { id: 'resource_pack', label: 'Resources' },
  { id: 'unit_pack', label: 'Units' },
  { id: 'cosmetic', label: 'Cosmetics' },
  { id: 'supporter_badge', label: 'Supporter Items' },
  { id: 'event_token', label: 'Event Items' },
];

function itemIcon(item: InventoryItem) {
  if (item.category === 'resource_pack') return 'R';
  if (item.category === 'unit_pack') return 'U';
  if (item.category === 'supporter_badge') return 'B';
  if (item.behavior === 'equippable') return 'E';
  return 'I';
}

export function InventoryPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [selected, setSelected] = useState<InventoryItem | null>(null);
  const [targetCityId, setTargetCityId] = useState('');
  const [renameValue, setRenameValue] = useState('');

  const inventoryQuery = useQuery({ queryKey: ['inventory', filter], queryFn: () => getInventory(filter === 'consumable' ? 'all' : filter) });
  const citiesQuery = useQuery({ queryKey: ['cities'], queryFn: getCities });
  const items = useMemo(
    () => (inventoryQuery.data?.items ?? []).filter((item) => (filter === 'consumable' ? item.behavior === 'consumable' : true)),
    [filter, inventoryQuery.data?.items],
  );
  const cities = citiesQuery.data ?? [];
  const cityId = targetCityId || cities[0]?.id || '';

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['inventory'] });
    void queryClient.invalidateQueries({ queryKey: ['cities'] });
  };
  const useMutationResult = useMutation({ mutationFn: useInventoryItem, onSuccess: () => { setSelected(null); refresh(); } });
  const equipMutationResult = useMutation({ mutationFn: equipInventoryItem, onSuccess: () => { setSelected(null); refresh(); } });
  const unequipMutationResult = useMutation({ mutationFn: unequipCosmetic, onSuccess: refresh });

  if (inventoryQuery.isLoading) return <LoadingState message="Loading inventory" />;
  if (inventoryQuery.isError) return <ErrorState message={inventoryQuery.error.message} />;

  const confirmAction = () => {
    if (!selected) return;
    if (selected.canUse) {
      useMutationResult.mutate({
        inventoryItemId: selected.inventoryItemId,
        quantity: 1,
        targetType: selected.targetType ?? undefined,
        targetId: selected.targetType === 'city' ? cityId : selected.targetType === 'player' ? 'current-player' : undefined,
        payload: renameValue ? { newName: renameValue } : undefined,
      });
      return;
    }
    if (selected.canEquip && selected.cosmeticSlot) {
      equipMutationResult.mutate({
        inventoryItemId: selected.inventoryItemId,
        cosmeticSlot: selected.cosmeticSlot,
        cityId: selected.cosmeticSlot === 'city_skin' ? cityId : undefined,
      });
    }
  };

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4">
      <section className="game-surface game-frame rounded-lg p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-black text-text">Inventory</h1>
            <p className="text-sm font-semibold text-muted">Items earned through quests, events, PvE, alliance rewards, and optional supporter gifts.</p>
          </div>
          <div className="flex gap-2">
            <Button variant={view === 'grid' ? 'primary' : 'secondary'} onClick={() => setView('grid')}>Grid</Button>
            <Button variant={view === 'list' ? 'primary' : 'secondary'} onClick={() => setView('list')}>List</Button>
          </div>
        </div>
      </section>

      <section className="game-surface game-frame rounded-lg p-2">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <Button key={item.id} variant={filter === item.id ? 'primary' : 'secondary'} onClick={() => setFilter(item.id)}>
              {item.label}
            </Button>
          ))}
        </div>
      </section>

      {useMutationResult.isError ? <Alert variant="danger">{useMutationResult.error.message}</Alert> : null}
      {equipMutationResult.isError ? <Alert variant="danger">{equipMutationResult.error.message}</Alert> : null}
      {unequipMutationResult.isError ? <Alert variant="danger">{unequipMutationResult.error.message}</Alert> : null}

      {items.length === 0 ? (
        <EmptyState title="Your inventory is empty." description="Complete quests, events, and PvE activities to earn items." />
      ) : (
        <section className={view === 'grid' ? 'grid gap-3 md:grid-cols-2 xl:grid-cols-3' : 'grid gap-2'}>
          {items.map((item) => (
            <Card key={item.inventoryItemId} className={`p-4 ${view === 'list' ? 'flex items-center justify-between gap-4' : 'grid gap-3'}`}>
              <div className="flex gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-border bg-surface-strong text-lg font-black text-primary">
                  {itemIcon(item)}
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-black text-text">{item.name}</h2>
                    {item.equipped ? <span className="rounded border border-primary px-2 py-0.5 text-xs font-black text-primary">Equipped</span> : null}
                  </div>
                  <p className="mt-1 text-sm font-semibold leading-6 text-muted">{item.description}</p>
                  <p className="mt-2 text-xs font-bold uppercase text-muted">
                    {item.category.replaceAll('_', ' ')} · Qty {item.quantity} · Source {item.sourceType.replaceAll('_', ' ')}
                    {item.expiresAt ? ` · Expires ${new Date(item.expiresAt).toLocaleDateString()}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {item.canUse || item.canEquip ? <Button onClick={() => setSelected(item)}>{item.canUse ? 'Use' : item.equipped ? 'Change' : 'Equip'}</Button> : null}
                {item.equipped && item.cosmeticSlot ? (
                  <Button variant="secondary" onClick={() => unequipMutationResult.mutate({ cosmeticSlot: item.cosmeticSlot!, cityId: item.cosmeticSlot === 'city_skin' ? cityId : undefined })}>
                    Unequip
                  </Button>
                ) : null}
              </div>
            </Card>
          ))}
        </section>
      )}

      {selected ? (
        <Modal isOpen={Boolean(selected)} title={`${selected.canUse ? 'Use' : 'Equip'} ${selected.name}`} onClose={() => setSelected(null)}>
          <div className="grid gap-4">
            <p className="text-sm font-semibold leading-6 text-muted">{selected.description}</p>
            {selected.targetType === 'city' || selected.cosmeticSlot === 'city_skin' ? (
              <label className="grid gap-1 text-sm font-bold text-text">
                Choose destination
                <select className="rounded-md border border-border bg-surface px-3 py-2" value={cityId} onChange={(event) => setTargetCityId(event.target.value)}>
                  {cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
                </select>
              </label>
            ) : null}
            {selected.itemId.includes('rename_token') ? (
              <label className="grid gap-1 text-sm font-bold text-text">
                New name
                <input className="rounded-md border border-border bg-surface px-3 py-2" value={renameValue} onChange={(event) => setRenameValue(event.target.value)} maxLength={32} />
              </label>
            ) : null}
            {selected.canEquip ? <Alert>This cosmetic changes appearance only and has no gameplay effect.</Alert> : null}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setSelected(null)}>Cancel</Button>
              <Button disabled={(selected.targetType === 'city' && !cityId) || useMutationResult.isPending || equipMutationResult.isPending} onClick={confirmAction}>
                {selected.canUse ? 'Use Item' : 'Equip'}
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </main>
  );
}
