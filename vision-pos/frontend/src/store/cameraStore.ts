import { create } from 'zustand'

interface CameraState {
  isActive: boolean
  isDetecting: boolean
  error: string | null
  setActive: (active: boolean) => void
  setDetecting: (detecting: boolean) => void
  setError: (error: string | null) => void
}

export const useCameraStore = create<CameraState>((set) => ({
  isActive: false,
  isDetecting: false,
  error: null,
  setActive: (active) => set({ isActive: active }),
  setDetecting: (detecting) => set({ isDetecting: detecting }),
  setError: (error) => set({ error }),
}))
