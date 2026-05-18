import { create } from 'zustand';

interface CharacterState {
  state: string;
  setState: (state: string) => void;
}

export const useCharacterStore = create<CharacterState>((set) => ({
  state: 'idle',
  setState: (state: string) => set({ state }),
}));
