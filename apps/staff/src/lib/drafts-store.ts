// AI drafts wait here until someone uses or discards them. A draft is never a
// saved assignment or class by itself — it fills an editor and the person still
// saves or publishes through the normal action (docs/dashboard-design.md).
//
// The backend keeps no draft records, so this workspace is client state.
import { create } from "zustand"
import { persist } from "zustand/middleware"

import { formatDate } from "./format"
import type {
  AgendaDraft,
  AiDraft,
  AssignmentDraft,
  DraftKind,
  DraftStatus,
} from "./types"

function summarize(kind: DraftKind, payload: AssignmentDraft | AgendaDraft): {
  title: string
  summary: string
} {
  if (kind === "assignment") {
    const draft = payload as AssignmentDraft
    const criteria = `${draft.rubric.length} rubric ${draft.rubric.length === 1 ? "criterion" : "criteria"}`
    return {
      title: draft.title,
      summary: `${criteria} · due ${formatDate(draft.suggestedDeadline)}`,
    }
  }
  const draft = payload as AgendaDraft
  return {
    title: draft.title,
    summary: draft.agenda.split("\n")[0] ?? "",
  }
}

let draftSequence = 0

/** The workspace keeps only recent drafts; the backend owns saved work. */
const MAX_DRAFTS = 20

function nextDraftId(): string {
  return `draft_${Date.now()}_${draftSequence++}`
}

interface DraftsState {
  drafts: AiDraft[]
  /** Records a fresh draft as waiting and returns it. */
  record: (
    kind: DraftKind,
    payload: AssignmentDraft | AgendaDraft,
  ) => AiDraft
  setStatus: (id: string, status: DraftStatus) => void
}

export const useDraftsStore = create<DraftsState>()(
  persist(
    (set) => ({
      drafts: [],
      record: (kind, payload) => {
        const { title, summary } = summarize(kind, payload)
        const draft: AiDraft = {
          id: nextDraftId(),
          kind,
          title,
          summary,
          status: "waiting",
          createdAt: new Date().toISOString(),
          payload,
        }
        set((state) => ({ drafts: [draft, ...state.drafts].slice(0, MAX_DRAFTS) }))
        return draft
      },
      setStatus: (id, status) =>
        set((state) => ({
          drafts: state.drafts.map((draft) =>
            draft.id === id ? { ...draft, status } : draft,
          ),
        })),
    }),
    { 
      name: "internity-staff-drafts",
      version: 1,
      partialize: (state) => ({ drafts: state.drafts }),
      migrate: (persisted) => {
        const saved = (persisted ?? {}) as { drafts?: unknown }
        return {
          drafts: Array.isArray(saved.drafts)
            ? (saved.drafts as AiDraft[]).slice(0, MAX_DRAFTS)
            : [],
        }
      },
    },
  ),
)

export function recordDraft(
  kind: DraftKind,
  payload: AssignmentDraft | AgendaDraft,
): AiDraft {
  return useDraftsStore.getState().record(kind, payload)
}

export function setDraftStatus(id: string, status: DraftStatus): void {
  useDraftsStore.getState().setStatus(id, status)
}
