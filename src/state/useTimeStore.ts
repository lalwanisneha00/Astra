import { create } from 'zustand'

export type TimeMode = 'explore' | 'observer'

interface TimeStore {
  mode: TimeMode
  currentDate: Date
  isPlaying: boolean
  /** Playback speed as a multiplier of real time. */
  speed: number
  setMode: (mode: TimeMode) => void
  setCurrentDate: (date: Date) => void
  setPlaying: (playing: boolean) => void
  setSpeed: (speed: number) => void
  resetToNow: () => void
}

/** Explore vs. observer mode, and the "current" simulated date (see Phase 6-8). */
export const useTimeStore = create<TimeStore>((set) => ({
  mode: 'explore',
  currentDate: new Date(),
  isPlaying: false,
  speed: 1,
  setMode: (mode) => set({ mode }),
  setCurrentDate: (currentDate) => set({ currentDate }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setSpeed: (speed) => set({ speed }),
  resetToNow: () => set({ currentDate: new Date() }),
}))
