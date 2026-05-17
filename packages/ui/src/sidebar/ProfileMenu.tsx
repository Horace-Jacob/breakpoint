"use client"

import * as Popover from "@radix-ui/react-popover"
import type { ReactNode } from "react"
import {
  ChevronDown,
  CreditCard,
  Loader2,
  LogOut,
  Moon,
  Settings,
  Sun,
  UserRound,
  Zap,
} from "lucide-react"
import { useState } from "react"

type Theme = "light" | "dark"

type SidebarUser = {
  name: string
  email: string
  avatarUrl: string | null
}

interface ProfileMenuProps {
  user: SidebarUser
  collapsed: boolean
  theme: Theme
  setTheme: (theme: Theme) => void
  isSigningOut: boolean
  onSignOut: () => void
}

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? "U"
  const second = parts.length > 1 ? parts[1]?.[0] : ""
  return `${first}${second}`.toUpperCase()
}

function AccountMenuRow({ children, strong = false }: { children: ReactNode; strong?: boolean }) {
  return (
    <button type="button" className="bp-account-menu-row" data-strong={strong}>
      {children}
    </button>
  )
}

export function ProfileMenu({
  user,
  collapsed,
  theme,
  setTheme,
  isSigningOut,
  onSignOut,
}: ProfileMenuProps) {
  const [open, setOpen] = useState(false)
  const initials = initialsFor(user.name)

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="bp-account-trigger"
          data-collapsed={collapsed}
          aria-label="Open profile menu"
          aria-expanded={open}
        >
          <span className="bp-account-avatar">
            {user.avatarUrl ? <img src={user.avatarUrl} alt={user.name} className="bp-account-avatar-image" /> : initials}
          </span>
          {!collapsed && (
            <>
              <span className="bp-account-trigger-copy">
                <span className="bp-account-name">{user.name}</span>
                {/* <span className="bp-account-plan">Pro plan</span> */}
              </span>
              <ChevronDown className="bp-account-chevron" data-open={open} />
            </>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="bp-account-menu"
          side={collapsed ? "right" : "top"}
          align={collapsed ? "center" : "start"}
          sideOffset={10}
        >
          <div className="bp-account-menu-user">
            <p className="bp-account-menu-name">{user.name}</p>
            <p className="bp-account-menu-email">{user.email}</p>
          </div>

          {/* <div className="bp-account-menu-divider" />

          <div className="bp-account-menu-list">
            <AccountMenuRow>
              <UserRound className="bp-account-menu-icon" />
              <span>Profile</span>
            </AccountMenuRow>
            <AccountMenuRow>
              <CreditCard className="bp-account-menu-icon" />
              <span>Billing</span>
              <span className="bp-account-badge">Pro</span>
            </AccountMenuRow>
            <AccountMenuRow strong>
              <Zap className="bp-account-menu-icon" />
              <span>Upgrade Plan</span>
            </AccountMenuRow>
            <AccountMenuRow>
              <Settings className="bp-account-menu-icon" />
              <span>Settings</span>
            </AccountMenuRow>
          </div> */}

          <div className="bp-account-menu-divider" />

          <div className="bp-theme-row">
            <span className="bp-theme-label">Theme</span>
            <span className="bp-theme-segment">
              <button
                type="button"
                onClick={() => setTheme("light")}
                aria-label="Light theme"
                aria-pressed={theme === "light"}
                className="bp-theme-option"
                data-active={theme === "light"}
              >
                <Sun className="bp-theme-icon" />
                <span>Light</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                aria-label="Dark theme"
                aria-pressed={theme === "dark"}
                className="bp-theme-option"
                data-active={theme === "dark"}
              >
                <Moon className="bp-theme-icon" />
                <span>Dark</span>
              </button>
            </span>
          </div>

          <div className="bp-account-menu-divider" />

          <button
            type="button"
            disabled={isSigningOut}
            onClick={onSignOut}
            aria-label="Sign out"
            className="bp-signout-button"
          >
            {isSigningOut ? <Loader2 className="bp-account-menu-icon bp-spin" /> : <LogOut className="bp-account-menu-icon" />}
            <span>{isSigningOut ? "Signing out..." : "Sign out"}</span>
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
