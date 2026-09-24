// `/supervisor/drafts`: the supervisor's AI drafts workspace.
import { createFileRoute } from "@tanstack/react-router"

import { DraftsBoard } from "@/components/drafts-board"
import { requireAnyRole } from "@/lib/guards"

export const Route = createFileRoute("/_app/supervisor/drafts")({
  beforeLoad: () => {
    requireAnyRole("supervisor", "instructor")
  },
  component: DraftsBoard,
})
