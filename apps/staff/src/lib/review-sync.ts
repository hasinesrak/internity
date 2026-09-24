// The shared signal that a review changed: the queue refetches so the row
// updates in place after a save.
import { create } from "zustand"

interface ReviewSyncState {
  version: number
  bump: () => void
}

export const useReviewSync = create<ReviewSyncState>((set) => ({
  version: 0,
  bump: () => set((state) => ({ version: state.version + 1 })),
}))

export function bumpReviews(): void {
  useReviewSync.getState().bump()
}
