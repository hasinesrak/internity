import type { ReactNode } from "react"
import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router"

import "@workspace/ui/globals.css"

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Internity platform" },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body className="min-h-svh bg-background text-foreground">
        {children}
        <Scripts />
      </body>
    </html>
  )
}
