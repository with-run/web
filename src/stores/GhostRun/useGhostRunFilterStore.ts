import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { INITIAL_FILTERS } from '@/constants/NormalRun';
import type { CircleMode } from '@/shared/hooks/useRunCircleMap';
import type { RunBottomSheetSnap } from '@/shared/hooks/useRunBottomSheet';
import type { RunningCourseFilterState } from '@/shared/components';

interface GhostRunFilterStore {
  searchKeyword: string;
  circleMode: CircleMode;
  sheetSnap: RunBottomSheetSnap;
  showFilterDrawer: boolean;
  filters: RunningCourseFilterState;
  appliedFilters: RunningCourseFilterState;
  filterRequestNonce: number;
  setSearchKeyword: (value: string) => void;
  setCircleMode: (mode: CircleMode) => void;
  setSheetSnap: (snap: RunBottomSheetSnap) => void;
  setShowFilterDrawer: (open: boolean) => void;
  handleFilterChange: (key: 'courseType' | 'difficulty', value: string) => void;
  handleDistanceRangeChange: (range: { min: number; max: number }) => void;
  handleSortByChange: (sortBy: string) => void;
  handleResetFilters: () => void;
  applyFilters: () => void;
}

export const useGhostRunFilterStore = create<GhostRunFilterStore>()(
  persist(
    (set) => ({
      searchKeyword: '',
      circleMode: 'USER_LOCATION',
      sheetSnap: 'collapsed',
      showFilterDrawer: false,
      filters: INITIAL_FILTERS,
      appliedFilters: INITIAL_FILTERS,
      filterRequestNonce: 0,

      setSearchKeyword: (value) => set({ searchKeyword: value }),
      setCircleMode: (mode) => set({ circleMode: mode }),
      setSheetSnap: (snap) => set({ sheetSnap: snap }),
      setShowFilterDrawer: (open) => set({ showFilterDrawer: open }),

      handleFilterChange: (key, value) =>
        set((state) => {
          if (value === '전체') {
            return { filters: { ...state.filters, [key]: [] } };
          }

          const nextValues = new Set(state.filters[key]);
          if (nextValues.has(value)) nextValues.delete(value);
          else nextValues.add(value);

          return {
            filters: { ...state.filters, [key]: Array.from(nextValues) },
          };
        }),

      handleDistanceRangeChange: (range) =>
        set((state) => ({
          filters: { ...state.filters, distanceRange: range },
        })),

      handleSortByChange: (sortBy) =>
        set((state) => ({
          filters: { ...state.filters, sortBy },
        })),

      handleResetFilters: () =>
        set((state) => ({
          filters: INITIAL_FILTERS,
          appliedFilters: INITIAL_FILTERS,
          filterRequestNonce: state.filterRequestNonce + 1,
        })),

      applyFilters: () =>
        set((state) => ({
          appliedFilters: state.filters,
          showFilterDrawer: false,
          filterRequestNonce: state.filterRequestNonce + 1,
        })),
    }),
    {
      name: 'ghost-run-filter-store',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        searchKeyword: state.searchKeyword,
        circleMode: state.circleMode,
        sheetSnap: state.sheetSnap,
        filters: state.filters,
        appliedFilters: state.appliedFilters,
        filterRequestNonce: state.filterRequestNonce,
      }),
    }
  )
);
