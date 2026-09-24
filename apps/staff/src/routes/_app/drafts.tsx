// `/drafts`: the instructor's AI drafts workspace.
import { createFileRoute } from "@tanstack/react-router"

import { DraftsBoard } from "@/components/drafts-board"
import { requireAnyRole } from "@/lib/guards"

export const Route = createFileRoute("/_app/drafts")({
  beforeLoad: () => {
    requireAnyRole("instructor", "supervisor")
  },
  component: DraftsBoard,
})
