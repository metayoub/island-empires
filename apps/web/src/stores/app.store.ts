import { create } from 'zustand';

type AppState = {
  appName: string;
  selectedCityId: string | null;
  sidebarOpen: boolean;
  setSelectedCityId: (cityId: string) => void;
  setSidebarOpen: (isOpen: boolean) => void;
};

export const useAppStore = create<AppState>((set) => ({
  appName: 'Island Empires',
  selectedCityId: null,
  sidebarOpen: false,
  setSelectedCityId: (cityId) => set({ selectedCityId: cityId }),
  setSidebarOpen: (isOpen) => set({ sidebarOpen: isOpen }),
}));
