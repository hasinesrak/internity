import { createFileRoute } from "@tanstack/react-router"

import { apiUrl } from "@/lib/api"

export const Route = createFileRoute("/")({ component: App })

function App() {
  return (
    <main className="flex min-h-svh p-6">
      <div className="flex max-w-md min-w-0 flex-col gap-2 text-sm leading-relaxed">
        <h1 className="text-lg font-medium">InternFlow staff</h1>
        <p>
          Departments, classes, assignments, and accounts for HR, instructors,
          supervisors, and admins.
        </p>
        <p className="text-muted-foreground">API {apiUrl()}</p>
      </div>
    </main>
  )
}
