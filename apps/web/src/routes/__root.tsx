import { useEffect } from "react"
import type { ReactNode } from "react"
import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router"
import { IconContext } from "@phosphor-icons/react"
import { NotFoundGlitch } from "@workspace/ui/components/motion/not-found/glitch"
import "@workspace/ui/globals.css"
import { initTheme } from "@workspace/ui/lib/theme-store"

// Reads the stored theme before first paint so the page never flashes the
// wrong one. No stored choice means dark — the product default. The theme store takes over from there.
const THEME_BOOTSTRAP = `(function(){try{var t=localStorage.getItem("internity-theme");if(t!=="light"&&t!=="dark"){t="dark"}var r=document.documentElement;r.classList.toggle("dark",t==="dark");r.style.colorScheme=t}catch(e){}})()`

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Internity" },
    ],
    links: [
      // The brand logo doubles as the app icon: a theme-aware SVG favicon
      // first, then raster fallbacks for browsers that cannot theme one.
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: "/favicon-light-32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: "/favicon-dark-32.png",
        media: "(prefers-color-scheme: dark)",
      },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.json" },
    ],
  }),
  notFoundComponent: () => (
    <main className="flex min-h-svh items-center justify-center bg-background p-6">
      <NotFoundGlitch
        homeHref="/dashboard"
        homeLabel="Back to overview"
        browseHref="/assignments"
        browseLabel="Open assignments"
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
      {/* Browser extensions (e.g. Grammarly) add attributes to <body> before
          React hydrates. suppressHydrationWarning keeps those from warning. */}
      <body suppressHydrationWarning>
        <IconContext.Provider value={{ weight: "duotone" }}>
          {children}
        </IconContext.Provider>
        <Scripts />
      </body>
    </html>
  )
}
