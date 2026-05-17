"use client"

import * as Tooltip from "@radix-ui/react-tooltip"
import {
  ChevronsLeft,
  ChevronsRight,
  FlaskConical,
  KeyRound,
  LayoutDashboard,
  Mic2,
  Settings2,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

import { BreakpointLogo } from "../logo/BreakpointLogo"
import { useBreakpointTheme } from "../theme/ThemeProvider"
import { ProfileMenu } from "./ProfileMenu"

export interface NavItem {
  label: string
  href: string
  icon: "dashboard" | "apiKeys" | "voicePolicy" | "playground" | "settings"
}

interface SidebarProps {
  navItems: NavItem[]
  user: {
    name: string
    email: string
    avatarUrl: string | null
  }
}

const iconMap: Record<NavItem["icon"], React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  apiKeys: KeyRound,
  voicePolicy: Mic2,
  playground: FlaskConical,
  settings: Settings2,
}

export function Sidebar({ navItems, user }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const { theme, setTheme } = useBreakpointTheme()

  useEffect(() => {
    setCollapsed(localStorage.getItem("breakpoint_sidebar_collapsed") === "true")
  }, [])

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem("breakpoint_sidebar_collapsed", String(next))
  }

  const handleSignOut = async () => {
    if (isSigningOut) {
      return
    }

    setIsSigningOut(true)

    try {
      const response = await fetch("/auth/signout", { method: "POST" })
      if (response.redirected && response.url) {
        window.location.assign(response.url)
        return
      }
    } catch {
      // Keep the UX deterministic even if the request is interrupted.
    }

    window.location.assign("/")
  }

  const settingsItem = navItems.find((item) => item.icon === "settings")
  const mainNavItems = navItems.filter((item) => item.icon !== "settings")

  const renderNavItem = (item: NavItem) => {
    const Icon = iconMap[item.icon]
    const isActive =
      item.href === "/dashboard"
        ? pathname === item.href
        : pathname === item.href || pathname.startsWith(`${item.href}/`)
    const navLink = (
      <Link
        key={item.href}
        href={item.href}
        aria-label={item.label}
        aria-current={isActive ? "page" : undefined}
        className="bp-sidebar-nav-item"
        data-active={isActive}
        data-collapsed={collapsed}
      >
        <Icon className="bp-sidebar-nav-icon" />
        {!collapsed && <span className="bp-sidebar-nav-label">{item.label}</span>}
      </Link>
    )

    if (!collapsed) {
      return navLink
    }

    return (
      <Tooltip.Root key={item.href}>
        <Tooltip.Trigger asChild>{navLink}</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content side="right" sideOffset={10} className="bp-sidebar-tooltip">
            {item.label}
            <Tooltip.Arrow className="bp-sidebar-tooltip-arrow" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    )
  }

  return (
    <Tooltip.Provider delayDuration={150}>
      <aside
        className="bp-sidebar"
        data-collapsed={collapsed}
        style={{ width: collapsed ? "var(--sidebar-width-collapsed)" : "var(--sidebar-width)" }}
      >
        <header className="bp-sidebar-header">
          <div className="bp-sidebar-brand">
            <span className="bp-sidebar-brand-mark">
              <BreakpointLogo size={16} />
            </span>
            {!collapsed && (
              <span className="bp-sidebar-brand-copy">
                <span className="bp-sidebar-brand-name">Breakpoint</span>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="bp-sidebar-icon-button"
          >
            {!collapsed && <ChevronsLeft className="bp-sidebar-icon" />}
          </button>
        </header>

        <nav className="bp-sidebar-nav" aria-label="Main navigation">
          {!collapsed && <p className="bp-sidebar-section-label">Navigation</p>}

          {mainNavItems.map(renderNavItem)}
        </nav>

        <div className="bp-sidebar-footer">
          {settingsItem ? (
            <div className="pb-2">
              {collapsed ? renderNavItem(settingsItem) : <div className="space-y-2">{renderNavItem(settingsItem)}</div>}
            </div>
          ) : null}
          {collapsed && (
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label="Expand sidebar"
              className="bp-sidebar-bottom-toggle"
            >
              <ChevronsRight className="bp-sidebar-icon" />
            </button>
          )}
          <ProfileMenu
            user={user}
            collapsed={collapsed}
            theme={theme}
            setTheme={setTheme}
            isSigningOut={isSigningOut}
            onSignOut={handleSignOut}
          />
        </div>
      </aside>
    </Tooltip.Provider>
  )
}
