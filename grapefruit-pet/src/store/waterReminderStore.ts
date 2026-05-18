import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WaterReminderState {
  enabled: boolean;
  interval: number; // 分钟
  lastDrinkTime: number; // 时间戳
  workHours: {
    start: string;
    end: string;
  };
  
  // Actions
  toggleEnabled: () => void;
  setInterval: (minutes: number) => void;
  markAsDrunk: () => void;
  setWorkHours: (start: string, end: string) => void;
}

export const useWaterReminderStore = create<WaterReminderState>()(
  persist(
    (set) => ({
      enabled: true,
      interval: 60, // 默认60分钟
      lastDrinkTime: Date.now(),
      workHours: {
        start: '09:00',
        end: '18:00',
      },
      
      toggleEnabled: () => set((state) => ({ 
        enabled: !state.enabled,
        lastDrinkTime: Date.now(), // 重置计时
      })),
      
      setInterval: (minutes) => set({ 
        interval: minutes,
        lastDrinkTime: Date.now(), // 重置计时
      }),
      
      markAsDrunk: () => set({ lastDrinkTime: Date.now() }),
      
      setWorkHours: (start, end) => set({
        workHours: { start, end },
      }),
    }),
    {
      name: 'water-reminder-storage',
    }
  )
);
