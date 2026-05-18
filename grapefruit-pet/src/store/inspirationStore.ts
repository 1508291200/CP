import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Inspiration, InspirationCategory, FilterOptions } from '../types/inspiration';
import { v4 as uuidv4 } from 'uuid';

interface InspirationState {
  inspirations: Inspiration[];
  currentView: Inspiration | null;
  filters: FilterOptions;
  searchQuery: string;
  isQuickInputVisible: boolean;
  isLibraryVisible: boolean;
  
  // Actions
  addInspiration: (data: Partial<Inspiration>) => string;
  updateInspiration: (id: string, data: Partial<Inspiration>) => void;
  deleteInspiration: (id: string) => void;
  toggleFavorite: (id: string) => void;
  toggleImplemented: (id: string) => void;
  setCurrentView: (inspiration: Inspiration | null) => void;
  setFilters: (filters: FilterOptions) => void;
  setSearchQuery: (query: string) => void;
  showQuickInput: () => void;
  hideQuickInput: () => void;
  showLibrary: () => void;
  hideLibrary: () => void;
  getFilteredInspirations: () => Inspiration[];
}

export const useInspirationStore = create<InspirationState>()(
  persist(
    (set, get) => ({
      inspirations: [],
      currentView: null,
      filters: {},
      searchQuery: '',
      isQuickInputVisible: false,
      isLibraryVisible: false,
      
      addInspiration: (data) => {
        const id = uuidv4();
        const now = Date.now();
        
        const inspiration: Inspiration = {
          id,
          title: data.title,
          content: data.content || '',
          createdAt: now,
          updatedAt: now,
          category: data.category || InspirationCategory.UNCATEGORIZED,
          tags: data.tags || [],
          favorite: data.favorite || false,
          archived: data.archived || false,
          implemented: data.implemented || false,
          priority: data.priority,
        };
        
        set((state) => ({
          inspirations: [inspiration, ...state.inspirations],
        }));
        
        return id;
      },
      
      updateInspiration: (id, data) => {
        set((state) => ({
          inspirations: state.inspirations.map((i) =>
            i.id === id
              ? { ...i, ...data, updatedAt: Date.now() }
              : i
          ),
        }));
      },
      
      deleteInspiration: (id) => {
        set((state) => ({
          inspirations: state.inspirations.filter((i) => i.id !== id),
          currentView: state.currentView?.id === id ? null : state.currentView,
        }));
      },
      
      toggleFavorite: (id) => {
        set((state) => ({
          inspirations: state.inspirations.map((i) =>
            i.id === id ? { ...i, favorite: !i.favorite } : i
          ),
        }));
      },
      
      toggleImplemented: (id) => {
        set((state) => ({
          inspirations: state.inspirations.map((i) =>
            i.id === id ? { ...i, implemented: !i.implemented } : i
          ),
        }));
      },
      
      setCurrentView: (inspiration) => {
        set({ currentView: inspiration });
      },
      
      setFilters: (filters) => {
        set({ filters });
      },
      
      setSearchQuery: (query) => {
        set({ searchQuery: query });
      },
      
      showQuickInput: () => {
        set({ isQuickInputVisible: true });
      },
      
      hideQuickInput: () => {
        set({ isQuickInputVisible: false });
      },
      
      showLibrary: () => {
        set({ isLibraryVisible: true });
      },
      
      hideLibrary: () => {
        set({ isLibraryVisible: false });
      },
      
      getFilteredInspirations: () => {
        const { inspirations, filters, searchQuery } = get();
        
        return inspirations.filter((inspiration) => {
          // 搜索过滤
          if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const searchableText = [
              inspiration.title || '',
              inspiration.content,
              ...inspiration.tags,
            ].join(' ').toLowerCase();
            
            if (!searchableText.includes(query)) {
              return false;
            }
          }
          
          // 分类过滤
          if (filters.category && inspiration.category !== filters.category) {
            return false;
          }
          
          // 标签过滤
          if (filters.tags && filters.tags.length > 0) {
            const hasMatchingTag = filters.tags.some((tag) =>
              inspiration.tags.includes(tag)
            );
            if (!hasMatchingTag) {
              return false;
            }
          }
          
          // 状态过滤
          if (filters.favorite !== undefined && inspiration.favorite !== filters.favorite) {
            return false;
          }
          
          if (filters.archived !== undefined && inspiration.archived !== filters.archived) {
            return false;
          }
          
          if (filters.implemented !== undefined && inspiration.implemented !== filters.implemented) {
            return false;
          }
          
          // 日期过滤
          if (filters.dateRange) {
            if (
              inspiration.createdAt < filters.dateRange.start ||
              inspiration.createdAt > filters.dateRange.end
            ) {
              return false;
            }
          }
          
          return true;
        });
      },
    }),
    {
      name: 'inspiration-storage',
      partialize: (state) => ({
        inspirations: state.inspirations,
        // 不持久化UI状态
      }),
    }
  )
);
