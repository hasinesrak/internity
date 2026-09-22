import { useEffect } from "react"
import type { ReactNode } from "react"
import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router"
import { IconContext } from "@phosphor-icons/react"
import { NotFoundGlitch } from "@workspace/ui/components/motion/not-found/glitch"
import appCss from "@workspace/ui/globals.css?url"
import { initTheme } from "@workspace/ui/lib/theme-store"

// Reads the stored theme before first paint so the page never flashes the
// wrong one. The theme store takes over from there.
const THEME_BOOTSTRAP = `(function(){try{var t=localStorage.getItem("internity-theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}var r=document.documentElement;r.classList.toggle("dark",t==="dark");r.style.colorScheme=t}catch(e){}})()`

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "InternFlow staff" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  notFoundComponent: () => (
    <main className="flex min-h-svh items-center justify-center bg-background p-6">
      <NotFoundGlitch
        homeHref="/"
        homeLabel="Back to overview"
        browseHref="/settings"
        browseLabel="Open settings"
      />
    </main>
  ),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: ReactNode }) {
  useEffect(() => {
    initTheme()
  }, [])

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
        <HeadContent />
      </head>
      <body>
        <IconContext.Provider value={{ weight: "duotone" }}>
          {children}
        </IconContext.Provider>
        <Scripts />
      </body>
    </html>
  )
}
