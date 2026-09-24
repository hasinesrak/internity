// Transient confirmations. Every mutation reports its result here, naming the
// exact object it acted on ("Submission saved for API Integration Brief").
import { create } from "zustand"

import type { ToastInput } from "@workspace/ui/components/motion/animated-toast-stack"

export type { ToastInput }

export interface ToastRecord extends ToastInput {
  id: string
  createdAt: number
}

interface ToastState {
  toasts: ToastRecord[]
  show: (input: ToastInput) => string
  dismiss: (id: string) => void
  clear: () => void
}

const DEFAULT_DURATION = 5000
const LIMIT = 4

let nextId = 0

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (input) => {
    const id = input.id ?? `toast-${nextId++}`
    const record: ToastRecord = { ...input, id, createdAt: Date.now() }
    set((state) => ({ toasts: [...state.toasts, record].slice(-LIMIT) }))
    const duration = input.duration ?? DEFAULT_DURATION
    if (duration > 0) {
      window.setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }))
      }, duration)
    }
    return id
  },
  dismiss: (id) => {
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }))
  },
  clear: () => set({ toasts: [] }),
}))

/** Call from anywhere: `toast.success("Submission saved for …")`. */
export const toast = {
  show: (input: ToastInput) => useToastStore.getState().show(input),
  success: (title: string, description?: string) =>
    useToastStore.getState().show({ title, description, status: "success" }),
  error: (title: string, description?: string) =>
    useToastStore.getState().show({ title, description, status: "error", duration: 8000 }),
  info: (title: string, description?: string) =>
    useToastStore.getState().show({ title, description, status: "info" }),
  loading: (title: string, description?: string) =>
    useToastStore.getState().show({
      title,
      description,
      status: "loading",
      duration: 0,
      dismissible: false,
    }),
  dismiss: (id: string) => useToastStore.getState().dismiss(id),
}

export { DEFAULT_DURATION }
