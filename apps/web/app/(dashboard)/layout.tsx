import { getUser } from "@breakpoint/lib"
import { Sidebar } from "@breakpoint/ui"
import type { NavItem } from "@breakpoint/ui"
import type { ReactNode } from "react"
import { redirect } from "next/navigation"

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: "dashboard",
  },
  {
    label: "API Keys",
    href: "/dashboard/api-keys",
    icon: "apiKeys",
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: "settings",
  },
]

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getUser()
  if (!user) {
    redirect("/")
  }

  const sidebarUser = {
    name: user.user_metadata?.full_name ?? user.email ?? "User",
    email: user.email ?? "",
    avatarUrl: user.user_metadata?.avatar_url ?? null,
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar navItems={navItems} user={sidebarUser} />
      <main className="flex-1 overflow-y-auto bg-background">{children}</main>
    </div>
  )
}
