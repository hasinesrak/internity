import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server"
import type { Register } from "@tanstack/react-router"
import type { RequestHandler } from "@tanstack/react-start/server"

import { officeDeniedMessage, staffRequestAllowed } from "./lib/office-network"

const fetch = createStartHandler(defaultStreamHandler)

export type ServerEntry = { fetch: RequestHandler<Register> }

function createServerEntry(entry: ServerEntry): ServerEntry {
  return {
    async fetch(request, opts) {
      if (!staffRequestAllowed(request)) {
        return new Response(officeDeniedMessage, {
          status: 403,
          headers: { "content-type": "text/plain; charset=utf-8" },
        })
      }
      return entry.fetch(request, opts)
    },
  }
}

export default createServerEntry({ fetch })
